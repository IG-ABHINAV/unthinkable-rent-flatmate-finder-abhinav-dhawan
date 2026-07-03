import { PrismaClient, Role, ListingStatus, InterestStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // 1. Clean old database entries
  console.log("Cleaning database...");
  await prisma.message.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.match.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.tenantProfile.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash password
  const passwordHash = await bcrypt.hash("password123", 12);

  // 3. Create users
  console.log("Creating users...");
  const admin = await prisma.user.create({
    data: {
      name: "Admin Roomly",
      email: "admin@roomly.com",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const ownerVikram = await prisma.user.create({
    data: {
      name: "Vikram Singh",
      email: "vikram@roomly.com",
      passwordHash,
      role: Role.OWNER,
    },
  });

  const ownerAnita = await prisma.user.create({
    data: {
      name: "Anita Desai",
      email: "anita@roomly.com",
      passwordHash,
      role: Role.OWNER,
    },
  });

  const ownerRohan = await prisma.user.create({
    data: {
      name: "Rohan Gupta",
      email: "rohan@roomly.com",
      passwordHash,
      role: Role.OWNER,
    },
  });

  const tenantAbhinav = await prisma.user.create({
    data: {
      name: "Abhinav Dhawan",
      email: "abhinav@roomly.com",
      passwordHash,
      role: Role.TENANT,
    },
  });

  const tenantPriya = await prisma.user.create({
    data: {
      name: "Priyah Sen",
      email: "priya@roomly.com",
      passwordHash,
      role: Role.TENANT,
    },
  });

  const tenantKabir = await prisma.user.create({
    data: {
      name: "Kabir Shah",
      email: "kabir@roomly.com",
      passwordHash,
      role: Role.TENANT,
    },
  });

  const tenantSneha = await prisma.user.create({
    data: {
      name: "Sneha Nair",
      email: "sneha@roomly.com",
      passwordHash,
      role: Role.TENANT,
    },
  });

  const tenantPooja = await prisma.user.create({
    data: {
      name: "Pooja Rao",
      email: "pooja@roomly.com",
      passwordHash,
      role: Role.TENANT,
    },
  });

  // 4. Create tenant profiles
  console.log("Creating profiles...");
  const profileAbhinav = await prisma.tenantProfile.create({
    data: {
      userId: tenantAbhinav.id,
      preferredLocation: "Indiranagar",
      budgetMin: 12000,
      budgetMax: 22000,
      moveInDate: new Date("2026-08-01"),
      gender: "MALE",
      genderPreference: "ANY",
      smoking: false,
      pets: true,
      diet: "ANY",
      sleepHabit: "NIGHT_OWL",
      interests: ["gaming", "music", "cooking"],
    },
  });

  const profilePriya = await prisma.tenantProfile.create({
    data: {
      userId: tenantPriya.id,
      preferredLocation: "Koramangala",
      budgetMin: 15000,
      budgetMax: 25000,
      moveInDate: new Date("2026-07-15"),
      gender: "FEMALE",
      genderPreference: "FEMALE",
      smoking: false,
      pets: false,
      diet: "VEG",
      sleepHabit: "EARLY_BIRD",
      interests: ["yoga", "reading", "cooking"],
    },
  });

  const profileKabir = await prisma.tenantProfile.create({
    data: {
      userId: tenantKabir.id,
      preferredLocation: "HSR Layout",
      budgetMin: 10000,
      budgetMax: 18000,
      moveInDate: new Date("2026-07-20"),
      gender: "MALE",
      genderPreference: "MALE",
      smoking: true,
      pets: false,
      diet: "ANY",
      sleepHabit: "NIGHT_OWL",
      interests: ["sports", "gaming", "gym"],
    },
  });

  const profileSneha = await prisma.tenantProfile.create({
    data: {
      userId: tenantSneha.id,
      preferredLocation: "Indiranagar",
      budgetMin: 16000,
      budgetMax: 28000,
      moveInDate: new Date("2026-08-10"),
      gender: "FEMALE",
      genderPreference: "ANY",
      smoking: false,
      pets: true,
      diet: "ANY",
      sleepHabit: "ANY",
      interests: ["music", "travel", "movies"],
    },
  });

  const profilePooja = await prisma.tenantProfile.create({
    data: {
      userId: tenantPooja.id,
      preferredLocation: "Koramangala",
      budgetMin: 18000,
      budgetMax: 30000,
      moveInDate: new Date("2026-07-25"),
      gender: "FEMALE",
      genderPreference: "FEMALE",
      smoking: false,
      pets: true,
      diet: "VEG",
      sleepHabit: "EARLY_BIRD",
      interests: ["cooking", "art", "reading"],
    },
  });

  // 5. Create listings
  console.log("Creating listings...");
  const listingVikram1 = await prisma.listing.create({
    data: {
      ownerId: ownerVikram.id,
      title: "Cozy Penthouse Room in Indiranagar",
      description: "Super chilled room in a penthouse flat on Indiranagar 100ft road. Private balcony with plenty of sunlight and sunset views. Comes with high-speed Wifi, AC, and fully equipped kitchen. Looking for a neat flatmate to share common areas. Pets are welcome!",
      location: "Indiranagar",
      rent: 18000,
      availableFrom: new Date("2026-07-20"),
      roomType: "1BHK",
      furnishingStatus: "Fully Furnished",
      photos: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "ANY",
      smokingAllowed: true,
      petsAllowed: true,
      dietaryPolicy: "NO_RESTRICTIONS",
      sleepHabitAllowed: "ANY",
      amenities: ["Wifi", "AC", "Kitchen", "Laundry"],
      roommateInterests: ["gaming", "music", "movies"],
      status: ListingStatus.ACTIVE,
    },
  });

  const listingVikram2 = await prisma.listing.create({
    data: {
      ownerId: ownerVikram.id,
      title: "Spacious Private Room in HSR Sector 3",
      description: "Quiet, sunny room in a premium sector in HSR. Fully furnished with study desk, wardrobe, and attached bathroom. Perfect for software engineers or students. Common lounge has a playstation and comfortable bean bags.",
      location: "HSR Layout",
      rent: 14000,
      availableFrom: new Date("2026-08-01"),
      roomType: "Private Room",
      furnishingStatus: "Fully Furnished",
      photos: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "MALE",
      smokingAllowed: true,
      petsAllowed: false,
      dietaryPolicy: "NO_RESTRICTIONS",
      sleepHabitAllowed: "NIGHT_OWL",
      amenities: ["Wifi", "Kitchen", "Laundry", "Parking"],
      roommateInterests: ["gaming", "sports"],
      status: ListingStatus.ACTIVE,
    },
  });

  const listingAnita1 = await prisma.listing.create({
    data: {
      ownerId: ownerAnita.id,
      title: "Veg-Only Female Flatmate Wanted - Koramangala",
      description: "Private room in a clean, spacious 3BHK flat in Koramangala 4th block. Gated community with gym, club house, and 24x7 security. Strict vegetarian household, no smoking or drinking allowed. Looking for a neat female professional.",
      location: "Koramangala",
      rent: 16000,
      availableFrom: new Date("2026-07-10"),
      roomType: "Private Room in 3BHK",
      furnishingStatus: "Semi Furnished",
      photos: ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "FEMALE",
      smokingAllowed: false,
      petsAllowed: false,
      dietaryPolicy: "VEG_ONLY",
      sleepHabitAllowed: "EARLY_BIRD",
      amenities: ["Wifi", "Gym", "Kitchen", "Laundry", "Parking"],
      roommateInterests: ["yoga", "reading", "cooking"],
      status: ListingStatus.ACTIVE,
    },
  });

  const listingAnita2 = await prisma.listing.create({
    data: {
      ownerId: ownerAnita.id,
      title: "Modern Studio Apartment in Koramangala 5th Block",
      description: "Stylish, self-contained studio apartment in the heart of Koramangala. Walking distance to the best cafes, restaurants, and co-working spaces. Fully functional kitchen, king bed, smart TV. Rooftop garden access.",
      location: "Koramangala",
      rent: 24000,
      availableFrom: new Date("2026-07-15"),
      roomType: "Studio",
      furnishingStatus: "Fully Furnished",
      photos: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "ANY",
      smokingAllowed: false,
      petsAllowed: true,
      dietaryPolicy: "NO_RESTRICTIONS",
      sleepHabitAllowed: "ANY",
      amenities: ["Wifi", "AC", "Kitchen", "Laundry"],
      roommateInterests: ["travel", "movies", "art"],
      status: ListingStatus.ACTIVE,
    },
  });

  const listingRohan1 = await prisma.listing.create({
    data: {
      ownerId: ownerRohan.id,
      title: "Budget-Friendly Room in HSR Sector 1",
      description: "Shared room in a cozy 2BHK flat near Sector 1. Clean house, looking for someone who keeps common areas tidy. Rent is extremely pocket-friendly and includes cleaning. Down for occasional weekend beers.",
      location: "HSR Layout",
      rent: 9000,
      availableFrom: new Date("2026-07-15"),
      roomType: "Shared Room",
      furnishingStatus: "Unfurnished",
      photos: ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "MALE",
      smokingAllowed: false,
      petsAllowed: false,
      dietaryPolicy: "NO_RESTRICTIONS",
      sleepHabitAllowed: "ANY",
      amenities: ["Wifi", "Kitchen"],
      roommateInterests: ["sports", "music"],
      status: ListingStatus.ACTIVE,
    },
  });

  const listingRohan2 = await prisma.listing.create({
    data: {
      ownerId: ownerRohan.id,
      title: "Luxury Room near Indiranagar Metro Station",
      description: "High-end bedroom in a premium 2BHK flat. Housekeeping, security, water filtration, and high-speed fiber internet are all included. Located 2 minutes away from the metro station. Looking for a professional roommate.",
      location: "Indiranagar",
      rent: 22000,
      availableFrom: new Date("2026-08-01"),
      roomType: "Private Room in 2BHK",
      furnishingStatus: "Fully Furnished",
      photos: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"],
      genderPreference: "ANY",
      smokingAllowed: false,
      petsAllowed: true,
      dietaryPolicy: "NO_RESTRICTIONS",
      sleepHabitAllowed: "ANY",
      amenities: ["Wifi", "AC", "Gym", "Kitchen", "Laundry", "Parking"],
      roommateInterests: ["music", "gym", "cooking"],
      status: ListingStatus.ACTIVE,
    },
  });

  const allListings = [listingVikram1, listingVikram2, listingAnita1, listingAnita2, listingRohan1, listingRohan2];

  // 6. Precompute high-quality match records
  console.log("Seeding match records...");
  const manualMatches = [
    {
      tenantId: tenantAbhinav.id,
      listingId: listingVikram1.id,
      score: 94,
      explanation: "Excellent fit! The rent of Rs. 18,000 matches your budget (Rs. 12,000 - Rs. 22,000) and it is located in your preferred location (Indiranagar). Both of you are pet-friendly and share a common interest in gaming and music. The penthouse vibe aligns perfectly.",
      scoringMethod: "LLM" as const,
    },
    {
      tenantId: tenantPriya.id,
      listingId: listingAnita1.id,
      score: 98,
      explanation: "Perfect match! The location (Koramangala) and rent (Rs. 16,000) match your budget and area preferences. You are both female and value a clean, strict vegetarian lifestyle. You also share hobbies in cooking, yoga, and reading!",
      scoringMethod: "LLM" as const,
    },
    {
      tenantId: tenantSneha.id,
      listingId: listingRohan2.id,
      score: 92,
      explanation: "Great match! Location is an exact match for Indiranagar, and the rent is well within your maximum budget. You both love pets and enjoy music.",
      scoringMethod: "LLM" as const,
    },
    {
      tenantId: tenantPooja.id,
      listingId: listingAnita1.id,
      score: 95,
      explanation: "Excellent match! Anita is looking for a female vegetarian roommate, which matches Pooja's profile exactly. Both enjoy reading and cooking, and Koramangala fits preferred locations.",
      scoringMethod: "LLM" as const,
    },
    {
      tenantId: tenantKabir.id,
      listingId: listingVikram2.id,
      score: 89,
      explanation: "Strong fit! Located in HSR Layout with rent at Rs. 14,000. Both are night owls who enjoy gaming. Perfect male flatmate compatibility.",
      scoringMethod: "LLM" as const,
    },
  ];

  for (const mm of manualMatches) {
    await prisma.match.create({ data: mm });
  }

  // Generate fallback matches for other tenant-listing combinations
  const tenants = [
    { id: tenantAbhinav.id, profile: profileAbhinav },
    { id: tenantPriya.id, profile: profilePriya },
    { id: tenantKabir.id, profile: profileKabir },
    { id: tenantSneha.id, profile: profileSneha },
    { id: tenantPooja.id, profile: profilePooja },
  ];

  for (const tenant of tenants) {
    for (const listing of allListings) {
      // Skip if manual match already exists
      const exists = manualMatches.some(m => m.tenantId === tenant.id && m.listingId === listing.id);
      if (exists) continue;

      // Simple fallback calculation for seeding
      const sameLoc = listing.location.toLowerCase() === tenant.profile.preferredLocation.toLowerCase();
      const inBudget = listing.rent >= tenant.profile.budgetMin && listing.rent <= tenant.profile.budgetMax;
      let score = 50;
      if (sameLoc) score += 25;
      if (inBudget) score += 15;
      if (listing.genderPreference !== "ANY" && tenant.profile.gender !== "ANY" && listing.genderPreference !== tenant.profile.gender) {
        score = 0;
      }

      await prisma.match.create({
        data: {
          tenantId: tenant.id,
          listingId: listing.id,
          score,
          explanation: `Smart matched at ${score}%. Location: ${listing.location} (${sameLoc ? "Matches" : "Different"}), Rent: Rs. ${listing.rent} (${inBudget ? "Within" : "Outside"} budget).`,
          scoringMethod: "FALLBACK",
        },
      });
    }
  }

  // 7. Create interests
  console.log("Seeding interests and message history...");
  const interestVikramAbhinav = await prisma.interest.create({
    data: {
      tenantId: tenantAbhinav.id,
      listingId: listingVikram1.id,
      status: InterestStatus.ACCEPTED,
    },
  });

  const interestAnitaPriya = await prisma.interest.create({
    data: {
      tenantId: tenantPriya.id,
      listingId: listingAnita1.id,
      status: InterestStatus.PENDING,
    },
  });

  const interestRohanSneha = await prisma.interest.create({
    data: {
      tenantId: tenantSneha.id,
      listingId: listingRohan2.id,
      status: InterestStatus.PENDING,
    },
  });

  // 8. Create chat messages
  console.log("Seeding chat messages...");
  await prisma.message.create({
    data: {
      interestId: interestVikramAbhinav.id,
      senderId: tenantAbhinav.id,
      content: "Hey Vikram! I'm really interested in your Indiranagar penthouse room. The terrace balcony looks fantastic, and I'd love to check it out.",
      createdAt: new Date("2026-07-02T10:00:00Z"),
    },
  });

  await prisma.message.create({
    data: {
      interestId: interestVikramAbhinav.id,
      senderId: ownerVikram.id,
      content: "Hey Abhinav! Thanks for reaching out. Yes, the balcony is awesome. I'm looking for an easygoing flatmate. Tell me a bit about your lifestyle and hobbies!",
      createdAt: new Date("2026-07-02T10:05:00Z"),
    },
  });

  await prisma.message.create({
    data: {
      interestId: interestVikramAbhinav.id,
      senderId: tenantAbhinav.id,
      content: "I'm a software developer, usually working hybrid. I like listening to rock music, gaming on PS5, and cooking occasionally. Also, I have a friendly 2-year old Golden Retriever, hope that's cool!",
      createdAt: new Date("2026-07-02T10:12:00Z"),
    },
  });

  await prisma.message.create({
    data: {
      interestId: interestVikramAbhinav.id,
      senderId: ownerVikram.id,
      content: "Oh, that's perfect! I love dogs and actually have a PlayStation in the living room too. The apartment is super dog-friendly. Let's schedule a visit this Saturday afternoon?",
      createdAt: new Date("2026-07-02T10:20:00Z"),
    },
  });

  await prisma.message.create({
    data: {
      interestId: interestVikramAbhinav.id,
      senderId: tenantAbhinav.id,
      content: "That sounds amazing! Saturday 3 PM works for me. See you then!",
      createdAt: new Date("2026-07-02T10:22:00Z"),
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
