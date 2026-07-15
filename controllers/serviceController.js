const Service = require("../models/Service");
const { WORKING_DAYS } = require("../models/Service");
const { removeSampleFile, MAX_FILES } = require("../middleware/upload");

const AVAILABILITY_STATUSES = ["available", "limited", "booked"];
const SAMPLE_TYPES = ["image", "pdf", "link"];

/**
 * Keeps only the sample fields we control. Prevents a client from injecting
 * arbitrary keys and caps the number of samples per listing.
 */
const sanitizeSamples = (samples) => {
  if (!Array.isArray(samples)) return undefined;

  return samples
    .filter((s) => s && typeof s.url === "string" && s.url.trim())
    .slice(0, MAX_FILES)
    .map((s) => ({
      url: s.url.trim(),
      caption: typeof s.caption === "string" ? s.caption.trim().slice(0, 140) : "",
      fileType: SAMPLE_TYPES.includes(s.fileType) ? s.fileType : "image",
      fileName: typeof s.fileName === "string" ? s.fileName.slice(0, 200) : "",
      size: Number.isFinite(Number(s.size)) ? Number(s.size) : 0,
    }));
};

const sanitizeAvailability = (availability) => {
  if (!availability || typeof availability !== "object") return undefined;

  const clean = {};

  clean.status = AVAILABILITY_STATUSES.includes(availability.status)
    ? availability.status
    : "available";

  const hours = Number(availability.hoursPerWeek);
  clean.hoursPerWeek = Number.isFinite(hours) ? Math.min(Math.max(hours, 0), 168) : 0;

  if (availability.availableFrom) {
    const date = new Date(availability.availableFrom);
    if (!Number.isNaN(date.getTime())) clean.availableFrom = date;
  }

  clean.workingDays = Array.isArray(availability.workingDays)
    ? [...new Set(availability.workingDays.filter((d) => WORKING_DAYS.includes(d)))]
    : [];

  clean.timezone =
    typeof availability.timezone === "string" ? availability.timezone.trim().slice(0, 60) : "";
  clean.note =
    typeof availability.note === "string" ? availability.note.trim().slice(0, 200) : "";

  return clean;
};

/**
 * Whitelist of client-writable fields. Stops mass assignment of things like
 * `freelancer`, `ratingAverage` or `ratingCount` through the request body.
 */
const pickServiceFields = (body) => {
  const fields = {};
  const direct = ["title", "description", "category", "priceType", "isActive"];

  direct.forEach((key) => {
    if (body[key] !== undefined) fields[key] = body[key];
  });

  if (body.price !== undefined) fields.price = Number(body.price);
  if (body.deliveryDays !== undefined) fields.deliveryDays = Number(body.deliveryDays);

  if (Array.isArray(body.tags)) {
    fields.tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
  }

  const samples = sanitizeSamples(body.samples);
  if (samples) fields.samples = samples;

  const availability = sanitizeAvailability(body.availability);
  if (availability) fields.availability = availability;

  return fields;
};

/** Deletes uploaded files that are no longer referenced by the listing. */
const pruneRemovedSamples = (oldSamples = [], newSamples = []) => {
  const kept = new Set(newSamples.map((s) => s.url));
  oldSamples
    .filter((s) => !kept.has(s.url))
    .forEach((s) => removeSampleFile(s.url));
};

exports.uploadServiceSamples = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded" });
    }

    const files = req.files.map((file) => ({
      url: `/uploads/samples/${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
      size: file.size,
      caption: "",
    }));

    res.status(201).json({ files });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createService = async (req, res) => {
  try {
    const service = await Service.create({
      ...pickServiceFields(req.body),
      freelancer: req.user._id,
    });
    res.status(201).json({ service });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this service" });
    }

    const fields = pickServiceFields(req.body);
    const previousSamples = service.samples.map((s) => ({ url: s.url }));

    Object.assign(service, fields);
    await service.save();

    if (fields.samples) pruneRemovedSamples(previousSamples, fields.samples);

    res.json({ service });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found" });
    if (service.freelancer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this service" });
    }

    const samples = service.samples.map((s) => s.url);
    await service.deleteOne();
    samples.forEach(removeSampleFile);

    res.json({ message: "Service deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getServices = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      freelancer,
      availability,
      hasSamples,
      page = 1,
      limit = 12,
    } = req.query;
    const query = { isActive: true };

    if (category) query.category = new RegExp(category, "i");
    if (freelancer) query.freelancer = freelancer;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) query.$text = { $search: search };

    if (availability && AVAILABILITY_STATUSES.includes(availability)) {
      query["availability.status"] = availability;
    }
    if (hasSamples === "true") {
      query["samples.0"] = { $exists: true };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [services, total] = await Promise.all([
      Service.find(query)
        .populate("freelancer", "name avatarUrl ratingAverage ratingCount location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Service.countDocuments(query),
    ]);

    res.json({
      services,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "freelancer",
      "name avatarUrl bio skills ratingAverage ratingCount location availability",
    );
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.json({ service });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyServices = async (req, res) => {
  try {
    const services = await Service.find({ freelancer: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ services });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
