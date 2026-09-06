const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valParts] = trimmed.split("=");
      const val = valParts.join("=");
      if (key && val) {
        process.env[key.trim()] = val.trim();
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const samplePOs = [
  { code: "PO1", description: "Engineering Knowledge: Apply mathematics, science, and engineering fundamentals to complex engineering problems." },
  { code: "PO2", description: "Problem Analysis: Identify, formulate, and analyze complex computer science engineering problems." },
  { code: "PO3", description: "Design/Development: Design algorithmic solutions for complex systems with appropriate consideration for public safety and constraints." },
  { code: "PO4", description: "Investigation: Conduct investigations of complex problems using research-based knowledge and methods." },
  { code: "PO5", description: "Modern Tool Usage: Create, select, and apply appropriate techniques, resources, and modern IT tools." },
  { code: "PO6", description: "The Engineer & Society: Apply reasoning informed by contextual knowledge to assess societal and legal issues." },
  { code: "PO7", description: "Environment & Sustainability: Understand the impact of engineering solutions in societal and environmental contexts." },
  { code: "PO8", description: "Ethics: Apply ethical principles and commit to professional ethics and responsibilities." },
  { code: "PO9", description: "Individual & Team Work: Function effectively as an individual, and as a member or leader in diverse teams." },
  { code: "PO10", description: "Communication: Communicate effectively on complex engineering activities with the engineering community." },
  { code: "PO11", description: "Project Management: Demonstrate knowledge of engineering and management principles to manage projects." },
  { code: "PO12", description: "Life-long Learning: Recognize the need for, and have the preparation to engage in independent life-long learning." },
];

const sampleCourse = {
  code: "CS301",
  title: "Advanced Algorithms & Complexity",
  description: "Department of Computer Science & Engineering · Core 3rd Year Curriculum",
  credit_hours: 3,
};

const sampleCOs = [
  {
    code: "CO1",
    statement: "Explain core algorithmic paradigms including divide-and-conquer, dynamic programming, and network flows.",
    bloom_level: 2,
    action_verbs: ["explain", "describe", "classify"],
  },
  {
    code: "CO2",
    statement: "Solve combinatorial optimization problems using dynamic programming bitmasking and greedy matroid strategies.",
    bloom_level: 3,
    action_verbs: ["solve", "apply", "compute"],
  },
  {
    code: "CO3",
    statement: "Analyze asymptotic time and space complexities using amortized accounting and potential functions.",
    bloom_level: 4,
    action_verbs: ["analyze", "differentiate", "examine"],
  },
  {
    code: "CO4",
    statement: "Deconstruct decision problems to prove NP-Completeness via polynomial-time reductions.",
    bloom_level: 4,
    action_verbs: ["deconstruct", "differentiate", "compare"],
  },
  {
    code: "CO5",
    statement: "Design approximation algorithms with provable approximation ratios for NP-hard optimization problems.",
    bloom_level: 6,
    action_verbs: ["design", "construct", "formulate"],
  },
];

async function seedTrackA() {
  console.log("Seeding Track A (Program Outcomes, Sample Course & Course Outcomes)...");

  // 1. Seed POs
  for (const po of samplePOs) {
    const { error } = await supabase
      .from("program_outcomes")
      .upsert(po, { onConflict: "code" });
    if (error) {
      console.warn(`! Could not upsert ${po.code}:`, error.message);
    }
  }
  console.log("✓ Seeded 12 ABET Program Outcomes (PO1–PO12)");

  // 2. Seed or fetch Course CS301
  let courseId = null;
  const { data: existingCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("code", sampleCourse.code)
    .maybeSingle();

  if (existingCourse) {
    courseId = existingCourse.id;
    console.log(`✓ Found existing course: ${sampleCourse.code} (${courseId})`);
  } else {
    const { data: newCourse, error: cErr } = await supabase
      .from("courses")
      .insert(sampleCourse)
      .select("id")
      .single();

    if (cErr) {
      console.error("! Failed to insert sample course:", cErr.message);
      return;
    }
    courseId = newCourse.id;
    console.log(`✓ Created sample course: ${sampleCourse.code} (${courseId})`);
  }

  // 3. Seed Course Outcomes for CS301
  const { count } = await supabase
    .from("course_outcomes")
    .select("*", { count: "exact", head: true })
    .eq("course_id", courseId);

  if (!count || count === 0) {
    const cosToInsert = sampleCOs.map((co) => ({
      ...co,
      course_id: courseId,
    }));
    const { error: coErr } = await supabase
      .from("course_outcomes")
      .insert(cosToInsert);

    if (coErr) {
      console.error("! Failed to insert sample COs:", coErr.message);
    } else {
      console.log(`✓ Seeded ${sampleCOs.length} initial Course Outcomes for ${sampleCourse.code}`);
    }
  } else {
    console.log(`✓ Course ${sampleCourse.code} already has ${count} Course Outcomes.`);
  }

  console.log("Track A seeding complete!");
}

seedTrackA();
