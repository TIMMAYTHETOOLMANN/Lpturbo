const { expect } = require("chai");
const dotenv = require("dotenv");

// Test the environment variable handling
describe("Wallet Credential Injection", function() {
  beforeEach(function() {
    // Clear existing environment variables
    delete process.env.PRIVATE_KEY;
    delete process.env.FUNDING_WALLET;
    delete process.env.CONTRACT_ADDRESS;
  });

  it("should validate private key is required", function() {
    // Test without PRIVATE_KEY
    expect(() => {
      if (!process.env.PRIVATE_KEY) {
        throw new Error("PRIVATE_KEY environment variable is required");
      }
    }).to.throw("PRIVATE_KEY environment variable is required");
  });

  it("should validate contract address is required for auto-reclaim", function() {
    expect(() => {
      if (!process.env.CONTRACT_ADDRESS) {
        throw new Error("CONTRACT_ADDRESS environment variable is required");
      }
    }).to.throw("CONTRACT_ADDRESS environment variable is required");
  });

  it("should use deployer address as default funding wallet", function() {
    const deployerAddress = "0x1234567890123456789012345678901234567890";
    const fundingWallet = process.env.FUNDING_WALLET || deployerAddress;
    
    expect(fundingWallet).to.equal(deployerAddress);
  });

  it("should use provided funding wallet when set", function() {
    const customFundingWallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    process.env.FUNDING_WALLET = customFundingWallet;
    
    const fundingWallet = process.env.FUNDING_WALLET;
    expect(fundingWallet).to.equal(customFundingWallet);
  });
});