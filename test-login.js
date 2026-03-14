
async function test() {
  try {
    const r = await fetch("http://localhost:3000/api/auth/login", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ email: "admin@school.ac.zw", password: "Admin@123" }) 
    });
    const data = await r.json();
    console.log(JSON.stringify(data));
  } catch (e) {
    console.error(e.message);
  }
}
test();
