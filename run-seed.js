async function seed() {
  try {
    const loginRes = await fetch("http://localhost:3000/api/auth/login", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: "admin@school.ac.zw", password: "Admin@123" }) 
    });
    const auth = await loginRes.json();
    if (!auth.token) {
        console.error("Login failed:", auth);
        return;
    }

    const seedRes = await fetch("http://localhost:3000/api/admin/seed-demo", { 
      method: "POST", 
      headers: { "Authorization": `Bearer ${auth.token}` } 
    });
    const result = await seedRes.json();
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
seed();
