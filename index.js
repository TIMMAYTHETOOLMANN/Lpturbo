const { USER_ADDRESS, USER_KEY } = require('./config');

// Example: Inject credentials into a web3/ethers provider, or log for debugging purposes
console.log("User Address:", USER_ADDRESS);
// Avoid printing secret keys in production logs!

// Example function that uses the credentials (replace with your integration logic)
function authenticateUser(address, key) {
  // Authentication logic here
  // Never expose or log the key!
  return address && key ? true : false;
}

const isAuthenticated = authenticateUser(USER_ADDRESS, USER_KEY);
console.log("Authenticated:", isAuthenticated);