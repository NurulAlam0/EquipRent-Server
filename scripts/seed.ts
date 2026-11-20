/**
 * Seeds an owner account + 6 approved equipment items so the home page
 * has real MongoDB data to show. Idempotent — safe to re-run.
 * Usage: npm run seed   (from server/)
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";
import { Equipment } from "../src/models/Equipment";
import { Review } from "../src/models/Review";

const imageUrl = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=960&q=80`;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in server/.env");
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // 1. Owner account (equipment belongs to someone)
  const ownerEmail = "owner@rentora.com";
  let owner = await User.findOne({ email: ownerEmail });
  if (!owner) {
    owner = await User.create({
      name: "Rahim Uddin",
      email: ownerEmail,
      photo: "/image/logo-mark.png",
      password: await bcrypt.hash("OwnerPass123", 10),
      role: "owner",
    });
    console.log(`Created owner ${ownerEmail}`);
  } else {
    console.log(`Owner ${ownerEmail} already exists`);
  }

  // 2. Professional rental inventory for the public catalogue
  const items = [
    {
      name: "DeWalt 18V Cordless Drill Kit",
      description:
        "Professional 18V cordless drill with battery and charger for construction, renovation and installation work.",
      category: "Construction Equipment",
      rentalPrice: 850,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 6,
      image: imageUrl("1504148455328-c376907d081c"),
      brand: "DeWalt",
      model: "18V XR",
      condition: "Excellent",
      rentalTerms: "Battery and charger included. Return clean and fully intact.",
      rating: 4.9,
      reviews: 86,
    },
    {
      name: "DJI Mini 4 Pro Drone Kit",
      description:
        "Compact 4K camera drone kit for professional photography, events and aerial video projects.",
      category: "Photography Equipment",
      rentalPrice: 2400,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1506947411487-a56738267384"),
      brand: "DJI",
      model: "Mini 4 Pro",
      condition: "Excellent",
      rentalTerms:
        "Batteries and controller included. Drone operation must follow local regulations.",
      rating: 4.9,
      reviews: 74,
    },
    {
      name: "Professional Business Laptop",
      description:
        "A dependable laptop for business travel, training sessions, presentations and short-term project work.",
      category: "Electronics",
      rentalPrice: 1300,
      rentalType: "Daily",
      location: "Sylhet, Bangladesh",
      availableQuantity: 8,
      image: imageUrl("1498050108023-c5249f4df085"),
      brand: "Business Grade",
      model: "Core i7, 16GB RAM",
      condition: "Excellent",
      rentalTerms: "Charger included. Return with all supplied accessories.",
      rating: 4.8,
      reviews: 62,
    },
    {
      name: "Portable Powered PA Speaker",
      description:
        "Portable high-output speaker for presentations, small events, community programs and outdoor gatherings.",
      category: "Event Equipment",
      rentalPrice: 1800,
      rentalType: "Daily",
      location: "Chattogram, Bangladesh",
      availableQuantity: 5,
      image: imageUrl("1598488035139-bdbb2231ce04"),
      brand: "Kisonli",
      model: "Portable PA",
      condition: "Excellent",
      rentalTerms: "Power cable included. Keep the speaker dry during use.",
      rating: 4.7,
      reviews: 53,
    },
    {
      name: "Toyota HiAce 12-Seater Van",
      description:
        "Spacious air-conditioned passenger van for team transport, events, family trips and out-of-town travel.",
      category: "Vehicles & Transportation",
      rentalPrice: 4800,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1570125909232-eb263c188f7e"),
      brand: "Toyota",
      model: "HiAce",
      condition: "Excellent",
      rentalTerms:
        "Driver and fuel are not included. Minimum one-day rental; valid driving documents required.",
      rating: 4.8,
      reviews: 102,
    },
    {
      name: "Construction Wheel Loader",
      description:
        "Heavy-duty wheel loader for site preparation, material handling and earthmoving on construction projects.",
      category: "Construction Equipment",
      rentalPrice: 12000,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 2,
      image: imageUrl("1580901368919-7738efb0f87e"),
      brand: "Volvo",
      model: "L120 Series",
      condition: "Excellent",
      rentalTerms: "Fuel and operator are quoted separately. Site access required.",
      rating: 4.8,
      reviews: 42,
    },
    {
      name: "Sony Alpha 7 IV Camera Kit",
      description: "Full-frame mirrorless camera kit with a versatile zoom lens for commercial shoots, portraits and content production.",
      category: "Photography Equipment",
      rentalPrice: 2200,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 4,
      image: imageUrl("1516035069371-29a1b244cc32"),
      brand: "Sony",
      model: "Alpha 7 IV",
      condition: "Excellent",
      rentalTerms: "Camera body, lens, two batteries and charger included.",
      rating: 4.9,
      reviews: 91,
    },
    {
      name: "Canon EOS R6 Mark II Kit",
      description: "High-performance full-frame camera package for weddings, events, interviews and professional video production.",
      category: "Photography Equipment",
      rentalPrice: 2500,
      rentalType: "Daily",
      location: "Chattogram, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1502920917128-1aa500764cbd"),
      brand: "Canon",
      model: "EOS R6 Mark II",
      condition: "Excellent",
      rentalTerms: "Lens and memory card available. Security deposit applies.",
      rating: 4.8,
      reviews: 67,
    },
    {
      name: "LED Video Light Panel Set",
      description: "Bi-color LED lighting set with stands and softboxes for studio shoots, product photography and video work.",
      category: "Photography Equipment",
      rentalPrice: 1100,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 6,
      image: imageUrl("1506157786151-b8491531f063"),
      brand: "Godox",
      model: "SL-60W Set",
      condition: "Excellent",
      rentalTerms: "Two lights, stands and power cables included.",
      rating: 4.7,
      reviews: 48,
    },
    {
      name: "4K Action Camera Adventure Kit",
      description: "Rugged 4K action camera with mounts and protective housing for travel, sports and outdoor production.",
      category: "Photography Equipment",
      rentalPrice: 900,
      rentalType: "Daily",
      location: "Sylhet, Bangladesh",
      availableQuantity: 7,
      image: imageUrl("1526170375885-4d8ecf77b99f"),
      brand: "GoPro",
      model: "HERO12 Black",
      condition: "Good",
      rentalTerms: "Mounts and one battery included. Extra batteries available.",
      rating: 4.6,
      reviews: 39,
    },
    {
      name: "Rotary Hammer Drill",
      description: "Heavy-duty rotary hammer for concrete drilling, tile removal and demanding renovation projects.",
      category: "Construction Equipment",
      rentalPrice: 1200,
      rentalType: "Daily",
      location: "Narayanganj, Bangladesh",
      availableQuantity: 5,
      image: imageUrl("1572981779307-38b8cabb2407"),
      brand: "Bosch",
      model: "GBH 5-40 D",
      condition: "Excellent",
      rentalTerms: "Drill bits included. Safety equipment recommended.",
      rating: 4.8,
      reviews: 58,
    },
    {
      name: "Industrial Angle Grinder",
      description: "Professional angle grinder for metal cutting, surface preparation and fabrication work.",
      category: "Construction Equipment",
      rentalPrice: 650,
      rentalType: "Daily",
      location: "Gazipur, Bangladesh",
      availableQuantity: 8,
      image: imageUrl("1504917595217-d4dc5ebe6122"),
      brand: "Makita",
      model: "GA9020",
      condition: "Good",
      rentalTerms: "Cutting discs billed separately. Use protective equipment.",
      rating: 4.6,
      reviews: 34,
    },
    {
      name: "Portable Cement Mixer",
      description: "Compact electric cement mixer for residential construction, repairs and small building projects.",
      category: "Construction Equipment",
      rentalPrice: 1800,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1541888946425-d81bb19240f5"),
      brand: "Crown",
      model: "CM-140",
      condition: "Excellent",
      rentalTerms: "Delivery available within Dhaka. Clean before return.",
      rating: 4.7,
      reviews: 29,
    },
    {
      name: "Scaffolding Tower Set",
      description: "Mobile aluminum scaffolding tower for painting, electrical work and safe indoor maintenance.",
      category: "Construction Equipment",
      rentalPrice: 2400,
      rentalType: "Weekly",
      location: "Dhaka, Bangladesh",
      availableQuantity: 4,
      image: imageUrl("1531834685032-c34bf0d84c77"),
      brand: "AluSafe",
      model: "Pro Tower 6M",
      condition: "Excellent",
      rentalTerms: "Assembly guidance included. Inspect all locking points before use.",
      rating: 4.8,
      reviews: 22,
    },
    {
      name: "Kubota Compact Tractor",
      description: "Reliable compact tractor for land preparation, landscaping and small-scale agricultural work.",
      category: "Agriculture Equipment",
      rentalPrice: 5500,
      rentalType: "Daily",
      location: "Rajshahi, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1586771107445-d3ca888129ff"),
      brand: "Kubota",
      model: "L4018",
      condition: "Excellent",
      rentalTerms: "Operator available on request. Fuel charged separately.",
      rating: 4.8,
      reviews: 51,
    },
    {
      name: "Agricultural Water Pump",
      description: "High-flow diesel water pump for irrigation, drainage and construction-site water management.",
      category: "Agriculture Equipment",
      rentalPrice: 1600,
      rentalType: "Daily",
      location: "Mymensingh, Bangladesh",
      availableQuantity: 6,
      image: imageUrl("1625246333195-78d9c38ad449"),
      brand: "Honda",
      model: "WB30",
      condition: "Good",
      rentalTerms: "Hoses available separately. Check fuel level at return.",
      rating: 4.6,
      reviews: 31,
    },
    {
      name: "Walk-Behind Power Tiller",
      description: "Versatile power tiller for soil preparation, vegetable plots and seasonal farm work.",
      category: "Agriculture Equipment",
      rentalPrice: 2800,
      rentalType: "Daily",
      location: "Rangpur, Bangladesh",
      availableQuantity: 4,
      image: imageUrl("1560493676-04071c5f467b"),
      brand: "BCS",
      model: "740",
      condition: "Excellent",
      rentalTerms: "Implements available separately. Basic operating guide included.",
      rating: 4.7,
      reviews: 37,
    },
    {
      name: "4K Projector Presentation Kit",
      description: "Bright 4K projector with screen and HDMI accessories for conferences, training and corporate events.",
      category: "Event Equipment",
      rentalPrice: 2200,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 5,
      image: imageUrl("1478720568477-152d9b164e26"),
      brand: "Epson",
      model: "EB-2250U",
      condition: "Excellent",
      rentalTerms: "Screen and HDMI cable included. Setup service available.",
      rating: 4.8,
      reviews: 45,
    },
    {
      name: "Wireless Microphone System",
      description: "Dual-channel wireless microphone system for seminars, weddings, stage programs and live presentations.",
      category: "Event Equipment",
      rentalPrice: 1400,
      rentalType: "Daily",
      location: "Chattogram, Bangladesh",
      availableQuantity: 7,
      image: imageUrl("1516280440614-37939bbacd81"),
      brand: "Shure",
      model: "BLX288",
      condition: "Excellent",
      rentalTerms: "Two microphones and receiver included. Batteries supplied.",
      rating: 4.8,
      reviews: 56,
    },
    {
      name: "Commercial Audio Mixer",
      description: "Professional multi-channel audio mixer for live sound, recording sessions and event production.",
      category: "Event Equipment",
      rentalPrice: 1900,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1470225620780-dba8ba36b745"),
      brand: "Yamaha",
      model: "MG16XU",
      condition: "Excellent",
      rentalTerms: "Power cable and basic setup guide included.",
      rating: 4.7,
      reviews: 33,
    },
    {
      name: "MacBook Pro M2 Workstation",
      description: "High-performance laptop for editing, design, software development and professional presentations.",
      category: "Electronics",
      rentalPrice: 2600,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 4,
      image: imageUrl("1517336714731-489689fd1ca8"),
      brand: "Apple",
      model: "MacBook Pro M2",
      condition: "Excellent",
      rentalTerms: "Charger included. Data must be backed up before return.",
      rating: 4.9,
      reviews: 78,
    },
    {
      name: "Portable Power Station",
      description: "Rechargeable power station for outdoor work, emergency backup, events and mobile production.",
      category: "Electronics",
      rentalPrice: 1700,
      rentalType: "Daily",
      location: "Sylhet, Bangladesh",
      availableQuantity: 5,
      image: imageUrl("1518770660439-4636190af475"),
      brand: "EcoFlow",
      model: "Delta 2",
      condition: "Excellent",
      rentalTerms: "Charge level recorded at pickup and return.",
      rating: 4.7,
      reviews: 41,
    },
    {
      name: "Toyota Corolla Sedan",
      description: "Comfortable air-conditioned sedan for business travel, airport transfers and city trips.",
      category: "Vehicles & Transportation",
      rentalPrice: 3200,
      rentalType: "Daily",
      location: "Dhaka, Bangladesh",
      availableQuantity: 4,
      image: imageUrl("1549317661-bd32c8ce0db2"),
      brand: "Toyota",
      model: "Corolla Axio",
      condition: "Excellent",
      rentalTerms: "Driver service available. Valid identification required.",
      rating: 4.8,
      reviews: 88,
    },
    {
      name: "Cargo Pickup Truck",
      description: "Practical pickup truck for moving equipment, event supplies, construction materials and cargo.",
      category: "Vehicles & Transportation",
      rentalPrice: 4200,
      rentalType: "Daily",
      location: "Gazipur, Bangladesh",
      availableQuantity: 3,
      image: imageUrl("1533473359331-0135ef1b58bf"),
      brand: "Isuzu",
      model: "D-Max",
      condition: "Good",
      rentalTerms: "Driver and loading support available at an additional charge.",
      rating: 4.6,
      reviews: 46,
    },
    {
      name: "Electric Pressure Washer",
      description: "High-pressure cleaning machine for vehicles, building exteriors, workshops and commercial spaces.",
      category: "Construction Equipment",
      rentalPrice: 1000,
      rentalType: "Daily",
      location: "Narayanganj, Bangladesh",
      availableQuantity: 6,
      image: imageUrl("1523413651479-597eb2da0ad6"),
      brand: "Karcher",
      model: "K4 Compact",
      condition: "Excellent",
      rentalTerms: "Hose and lance included. Use with clean water only.",
      rating: 4.7,
      reviews: 36,
    },
    {
      name: "Professional Tablet Bundle",
      description: "Tablet bundle for registration desks, field surveys, classroom training and event check-in.",
      category: "Electronics",
      rentalPrice: 950,
      rentalType: "Daily",
      location: "Chattogram, Bangladesh",
      availableQuantity: 10,
      image: imageUrl("1544244015-0df4b3ffc6b0"),
      brand: "Samsung",
      model: "Galaxy Tab S9",
      condition: "Excellent",
      rentalTerms: "Tablet, charger and protective case included.",
      rating: 4.6,
      reviews: 28,
    },
  ];

  const legacyItems = [
    { name: "Volvo Wheel Loader", image: "1504307651254-35680f356dfd" },
    { name: "Pentax DSLR Camera Kit", image: "1492684223066-81342ee5ff30" },
    { name: "ThinkPad Business Laptop", image: "1496181133206-80ce9b88a853" },
    { name: "Event Stage & Lighting Pack", image: "1524368535928-5b5e00ddc76b" },
    { name: "Toyota HiAce Van", image: "1519641471654-76ce0107ad1b" },
    { name: "Farm Tractor 4WD", image: "1500382017468-9049fed747ef" },
  ];
  for (const item of legacyItems) {
    await Equipment.updateOne(
      { owner: owner._id, name: item.name },
      { $set: { image: imageUrl(item.image), status: "rejected" } }
    );
  }
  const existingItems = await Equipment.find({
    owner: owner._id,
    name: { $in: items.map((item) => item.name) },
  })
    .select("_id name")
    .lean();

  for (const item of items) {
    const existing = existingItems.find((row) => row.name === item.name);
    if (existing) {
      await Equipment.updateOne(
        { _id: existing._id },
        { $set: { ...item, owner: owner._id, status: "approved" } }
      );
    } else {
      await Equipment.create({
        ...item,
        owner: owner._id,
        status: "approved",
      });
    }
  }
  console.log(`Seeded or updated ${items.length} approved equipment items`);

  const total = await Equipment.countDocuments();
  console.log(`Equipment collection now has ${total} documents`);

  // 3. Customer reviews for the home page
  const reviews = [
    {
      name: "Farhana Rahman",
      location: "Dhaka, Bangladesh",
      rating: 5,
      comment:
        "Booked the DJI drone for a weekend shoot — booking took two minutes and the kit arrived ready to use. Will rent again.",
    },
    {
      name: "Tanvir Ahmed",
      location: "Chattogram, Bangladesh",
      rating: 5,
      comment:
        "Rented a professional drill kit for our renovation. Fair daily rate and the owner delivered right on time.",
    },
    {
      name: "Nusrat Jahan",
      location: "Sylhet, Bangladesh",
      rating: 4,
      comment:
        "Great laptop for our event registration desk. Support answered my calls quickly whenever I had a question.",
    },
    {
      name: "Mahbub Hasan",
      location: "Rajshahi, Bangladesh",
      rating: 5,
      comment:
        "The HiAce booking was smooth and payment felt completely secure. Highly recommend Rentora for group travel.",
    },
  ];

  for (const review of reviews) {
    await Review.updateOne(
      { name: review.name },
      { $set: review },
      { upsert: true }
    );
  }
  console.log(`Seeded or updated ${reviews.length} customer reviews`);

  const reviewTotal = await Review.countDocuments();
  console.log(`Review collection now has ${reviewTotal} documents`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
