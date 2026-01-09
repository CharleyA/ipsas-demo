
const loginData = {
  email: "admin@ipsas.ac.zw",
  password: "Password123!"
};

async function testLogin() {
  console.log("Testing login with:", loginData);
  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginData),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", JSON.stringify(data, null, 2));

    if (data.token) {
      console.log("Token received. Testing /api/auth/me...");
      const meResponse = await fetch("http://localhost:3000/api/auth/me", {
        headers: { 
          "Authorization": `Bearer ${data.token}`
        },
      });
      console.log("Me Response status:", meResponse.status);
      const meData = await meResponse.json();
      console.log("Me Response data:", JSON.stringify(meData, null, 2));
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testLogin();
