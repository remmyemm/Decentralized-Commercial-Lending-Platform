import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockBorrowerData = new Map();
let nextBorrowerId = 1;
let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal

// Mock contract functions
const mockContract = {
  registerBorrower: (businessName, revenue, creditScore, sender) => {
    if (revenue <= 0) return { err: 1 };
    if (creditScore < 300 || creditScore > 850) return { err: 2 };
    
    const borrowerId = nextBorrowerId++;
    mockBorrowerData.set(borrowerId, {
      principalId: sender,
      businessName,
      revenue,
      creditScore,
      verified: false
    });
    
    return { ok: borrowerId };
  },
  
  verifyBorrower: (borrowerId, sender) => {
    if (sender !== admin) return { err: 3 };
    if (!mockBorrowerData.has(borrowerId)) return { err: 4 };
    
    const borrower = mockBorrowerData.get(borrowerId);
    borrower.verified = true;
    mockBorrowerData.set(borrowerId, borrower);
    
    return { ok: true };
  },
  
  getBorrower: (borrowerId) => {
    return mockBorrowerData.get(borrowerId) || null;
  },
  
  isVerified: (borrowerId) => {
    const borrower = mockBorrowerData.get(borrowerId);
    return borrower ? borrower.verified : false;
  },
  
  setAdmin: (newAdmin, sender) => {
    if (sender !== admin) return { err: 5 };
    admin = newAdmin;
    return { ok: true };
  }
};

describe('Borrower Verification Contract', () => {
  beforeEach(() => {
    // Reset the mock data before each test
    mockBorrowerData.clear();
    nextBorrowerId = 1;
    admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  });
  
  it('should register a new borrower with valid data', () => {
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockContract.registerBorrower('Acme Corp', 1000000, 750, sender);
    
    expect(result).toHaveProperty('ok');
    const borrowerId = result.ok;
    
    const borrower = mockContract.getBorrower(borrowerId);
    expect(borrower).not.toBeNull();
    expect(borrower.businessName).toBe('Acme Corp');
    expect(borrower.revenue).toBe(1000000);
    expect(borrower.creditScore).toBe(750);
    expect(borrower.verified).toBe(false);
  });
  
  it('should reject registration with invalid revenue', () => {
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockContract.registerBorrower('Bad Corp', 0, 750, sender);
    
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(1);
  });
  
  it('should reject registration with invalid credit score', () => {
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockContract.registerBorrower('Bad Corp', 1000000, 900, sender);
    
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(2);
  });
  
  it('should verify a borrower when admin calls', () => {
    // First register a borrower
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerBorrower('Acme Corp', 1000000, 750, sender);
    const borrowerId = registerResult.ok;
    
    // Verify the borrower
    const verifyResult = mockContract.verifyBorrower(borrowerId, admin);
    expect(verifyResult).toHaveProperty('ok');
    expect(verifyResult.ok).toBe(true);
    
    // Check that the borrower is now verified
    const isVerified = mockContract.isVerified(borrowerId);
    expect(isVerified).toBe(true);
  });
  
  it('should reject verification from non-admin', () => {
    // First register a borrower
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerBorrower('Acme Corp', 1000000, 750, sender);
    const borrowerId = registerResult.ok;
    
    // Try to verify from non-admin
    const verifyResult = mockContract.verifyBorrower(borrowerId, sender);
    expect(verifyResult).toHaveProperty('err');
    expect(verifyResult.err).toBe(3);
    
    // Check that the borrower is still not verified
    const isVerified = mockContract.isVerified(borrowerId);
    expect(isVerified).toBe(false);
  });
});
