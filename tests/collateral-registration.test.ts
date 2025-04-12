import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract interactions
const mockCollateralData = new Map();
let nextCollateralId = 1;
let admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Example principal

// Mock contract functions
const mockContract = {
  registerCollateral: (borrowerId, assetType, assetValue, assetDescription, sender) => {
    if (assetValue <= 0) return { err: 1 };
    
    const collateralId = nextCollateralId++;
    mockCollateralData.set(collateralId, {
      borrowerId,
      assetType,
      assetValue,
      assetDescription,
      registered: false,
      loanId: null
    });
    
    return { ok: collateralId };
  },
  
  verifyCollateral: (collateralId, sender) => {
    if (sender !== admin) return { err: 2 };
    if (!mockCollateralData.has(collateralId)) return { err: 3 };
    
    const collateral = mockCollateralData.get(collateralId);
    collateral.registered = true;
    mockCollateralData.set(collateralId, collateral);
    
    return { ok: true };
  },
  
  assignToLoan: (collateralId, loanId, sender) => {
    if (sender !== admin) return { err: 4 };
    if (!mockCollateralData.has(collateralId)) return { err: 7 };
    
    const collateral = mockCollateralData.get(collateralId);
    if (!collateral.registered) return { err: 5 };
    if (collateral.loanId !== null) return { err: 6 };
    
    collateral.loanId = loanId;
    mockCollateralData.set(collateralId, collateral);
    
    return { ok: true };
  },
  
  releaseFromLoan: (collateralId, sender) => {
    if (sender !== admin) return { err: 8 };
    if (!mockCollateralData.has(collateralId)) return { err: 10 };
    
    const collateral = mockCollateralData.get(collateralId);
    if (collateral.loanId === null) return { err: 9 };
    
    collateral.loanId = null;
    mockCollateralData.set(collateralId, collateral);
    
    return { ok: true };
  },
  
  getCollateral: (collateralId) => {
    return mockCollateralData.get(collateralId) || null;
  },
  
  setAdmin: (newAdmin, sender) => {
    if (sender !== admin) return { err: 11 };
    admin = newAdmin;
    return { ok: true };
  }
};

describe('Collateral Registration Contract', () => {
  beforeEach(() => {
    // Reset the mock data before each test
    mockCollateralData.clear();
    nextCollateralId = 1;
    admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  });
  
  it('should register a new collateral with valid data', () => {
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockContract.registerCollateral(1, 'Real Estate', 500000, 'Commercial building at 123 Main St', sender);
    
    expect(result).toHaveProperty('ok');
    const collateralId = result.ok;
    
    const collateral = mockContract.getCollateral(collateralId);
    expect(collateral).not.toBeNull();
    expect(collateral.assetType).toBe('Real Estate');
    expect(collateral.assetValue).toBe(500000);
    expect(collateral.registered).toBe(false);
    expect(collateral.loanId).toBeNull();
  });
  
  it('should reject registration with invalid asset value', () => {
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockContract.registerCollateral(1, 'Real Estate', 0, 'Commercial building', sender);
    
    expect(result).toHaveProperty('err');
    expect(result.err).toBe(1);
  });
  
  it('should verify a collateral when admin calls', () => {
    // First register a collateral
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerCollateral(1, 'Real Estate', 500000, 'Commercial building', sender);
    const collateralId = registerResult.ok;
    
    // Verify the collateral
    const verifyResult = mockContract.verifyCollateral(collateralId, admin);
    expect(verifyResult).toHaveProperty('ok');
    expect(verifyResult.ok).toBe(true);
    
    // Check that the collateral is now verified
    const collateral = mockContract.getCollateral(collateralId);
    expect(collateral.registered).toBe(true);
  });
  
  it('should reject verification from non-admin', () => {
    // First register a collateral
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerCollateral(1, 'Real Estate', 500000, 'Commercial building', sender);
    const collateralId = registerResult.ok;
    
    // Try to verify from non-admin
    const verifyResult = mockContract.verifyCollateral(collateralId, sender);
    expect(verifyResult).toHaveProperty('err');
    expect(verifyResult.err).toBe(2);
    
    // Check that the collateral is still not verified
    const collateral = mockContract.getCollateral(collateralId);
    expect(collateral.registered).toBe(false);
  });
  
  it('should assign collateral to a loan', () => {
    // First register and verify a collateral
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerCollateral(1, 'Real Estate', 500000, 'Commercial building', sender);
    const collateralId = registerResult.ok;
    mockContract.verifyCollateral(collateralId, admin);
    
    // Assign to a loan
    const loanId = 1;
    const assignResult = mockContract.assignToLoan(collateralId, loanId, admin);
    expect(assignResult).toHaveProperty('ok');
    expect(assignResult.ok).toBe(true);
    
    // Check that the collateral is now assigned
    const collateral = mockContract.getCollateral(collateralId);
    expect(collateral.loanId).toBe(loanId);
  });
  
  it('should release collateral from a loan', () => {
    // First register, verify, and assign a collateral
    const sender = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const registerResult = mockContract.registerCollateral(1, 'Real Estate', 500000, 'Commercial building', sender);
    const collateralId = registerResult.ok;
    mockContract.verifyCollateral(collateralId, admin);
    mockContract.assignToLoan(collateralId, 1, admin);
    
    // Release from loan
    const releaseResult = mockContract.releaseFromLoan(collateralId, admin);
    expect(releaseResult).toHaveProperty('ok');
    expect(releaseResult.ok).toBe(true);
    
    // Check that the collateral is now released
    const collateral = mockContract.getCollateral(collateralId);
    expect(collateral.loanId).toBeNull();
  });
});
