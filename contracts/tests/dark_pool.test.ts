// Verification Tests for Dark Pool Contract
// Verifies contract compilation and type correctness

describe('DarkPool Contract Compilation', () => {
  test('contract-info.json should have correct structure', () => {
    const contractInfo = require('../obj/dark_pool/compiler/contract-info.json');
    
    // Verify compiler version
    expect(contractInfo['compiler-version']).toBeDefined();
    expect(contractInfo['language-version']).toBeDefined();
    
    // Verify circuits are defined
    expect(contractInfo.circuits).toHaveLength(6);
    
    // Verify circuit names
    const circuitNames = contractInfo.circuits.map((c: any) => c.name);
    expect(circuitNames).toContain('getStateRoot');
    expect(circuitNames).toContain('getLastBatchId');
    expect(circuitNames).toContain('getBatchCount');
    expect(circuitNames).toContain('submitBatchProof');
    expect(circuitNames).toContain('updateSequencer');
    expect(circuitNames).toContain('getContractInfo');
    
    // Verify ledger fields
    expect(contractInfo.ledger).toHaveLength(5);
    const ledgerNames = contractInfo.ledger.map((l: any) => l.name);
    expect(ledgerNames).toContain('stateRoot');
    expect(ledgerNames).toContain('lastBatchId');
    expect(ledgerNames).toContain('batchCount');
    expect(ledgerNames).toContain('sequencerAddress');
    expect(ledgerNames).toContain('owner');
  });

  test('submitBatchProof should have correct arguments', () => {
    const contractInfo = require('../obj/dark_pool/compiler/contract-info.json');
    
    const submitBatch = contractInfo.circuits.find((c: any) => c.name === 'submitBatchProof');
    expect(submitBatch).toBeDefined();
    expect(submitBatch.arguments).toHaveLength(5);
    
    const argNames = submitBatch.arguments.map((a: any) => a.name);
    expect(argNames).toContain('batchHash');
    expect(argNames).toContain('oldStateRoot');
    expect(argNames).toContain('newStateRoot');
    expect(argNames).toContain('timestamp');
    expect(argNames).toContain('orderCount');
    
    // All arguments should be Field type
    submitBatch.arguments.forEach((arg: any) => {
      expect(arg['type']['type-name']).toBe('Field');
    });
    
    // Return type should be Boolean
    expect(submitBatch['result-type']['type-name']).toBe('Boolean');
  });

  test('contract TypeScript definitions should exist', () => {
    const fs = require('fs');
    const path = require('path');
    
    const typeDefPath = path.join(__dirname, '../obj/dark_pool/contract/index.d.ts');
    const jsPath = path.join(__dirname, '../obj/dark_pool/contract/index.js');
    
    expect(fs.existsSync(typeDefPath)).toBe(true);
    expect(fs.existsSync(jsPath)).toBe(true);
    
    // Verify type definitions contain expected exports
    const typeDefs = fs.readFileSync(typeDefPath, 'utf-8');
    expect(typeDefs).toContain('ImpureCircuits');
    expect(typeDefs).toContain('getStateRoot');
    expect(typeDefs).toContain('submitBatchProof');
    expect(typeDefs).toContain('Order');
  });

  test('contract JavaScript should be valid', () => {
    const fs = require('fs');
    const path = require('path');
    
    const jsPath = path.join(__dirname, '../obj/dark_pool/contract/index.js');
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    
    // Should be valid JavaScript (check for basic syntax)
    expect(jsContent).toContain('export');
    expect(jsContent).toContain('submitBatchProof');
    expect(jsContent).toContain('getStateRoot');
    
    // Should not be empty
    expect(jsContent.length).toBeGreaterThan(1000);
  });
});
