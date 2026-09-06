const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
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

const demoUsers = [
  {
    email: "senior@facultyos.edu",
    password: "DemoFaculty123!",
    full_name: "Dr. Eleanor Vance (Senior)",
    role: "senior",
  },
  {
    email: "junior@facultyos.edu",
    password: "DemoFaculty123!",
    full_name: "Dr. Marcus Chen (Junior)",
    role: "junior",
  },
  {
    email: "admin@facultyos.edu",
    password: "DemoFaculty123!",
    full_name: "Prof. Sarah Sterling (Dean/Admin)",
    role: "admin",
  },
];

async function seedAuthUsers() {
  console.log("Provisioning demo users into Supabase Auth...");

  for (const u of demoUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.full_name,
          role: u.role,
        },
      });

      if (error) {
        if (error.message.includes("already been registered") || error.status === 422) {
          console.log(`✓ User ${u.email} already exists.`);
        } else {
          console.warn(`! Could not create ${u.email}:`, error.message);
        }
      } else {
        console.log(`✓ Successfully created demo user: ${u.email}`);
      }
    } catch (err) {
      console.warn(`! Error for ${u.email}:`, err.message);
    }
  }

  console.log("Demo users provisioning finished!");
}

seedAuthUsers();
