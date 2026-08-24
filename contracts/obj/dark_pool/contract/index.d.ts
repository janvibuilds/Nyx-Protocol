import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Order = { id: bigint;
                      clientOrderId: bigint;
                      pair: bigint;
                      side: boolean;
                      price: bigint;
                      amount: bigint;
                      timestamp: bigint
                    };

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  getStateRoot(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getLastBatchId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getBatchCount(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  submitBatchProof(context: __compactRuntime.CircuitContext<PS>,
                   batchHash_0: bigint,
                   oldStateRoot_0: bigint,
                   newStateRoot_0: bigint,
                   timestamp_0: bigint,
                   orderCount_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  updateSequencer(context: __compactRuntime.CircuitContext<PS>,
                  newSequencer_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getContractInfo(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint]>;
}

export type ProvableCircuits<PS> = {
  getStateRoot(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getLastBatchId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getBatchCount(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  submitBatchProof(context: __compactRuntime.CircuitContext<PS>,
                   batchHash_0: bigint,
                   oldStateRoot_0: bigint,
                   newStateRoot_0: bigint,
                   timestamp_0: bigint,
                   orderCount_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  updateSequencer(context: __compactRuntime.CircuitContext<PS>,
                  newSequencer_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getContractInfo(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint]>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  getStateRoot(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getLastBatchId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  getBatchCount(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, bigint>;
  submitBatchProof(context: __compactRuntime.CircuitContext<PS>,
                   batchHash_0: bigint,
                   oldStateRoot_0: bigint,
                   newStateRoot_0: bigint,
                   timestamp_0: bigint,
                   orderCount_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  updateSequencer(context: __compactRuntime.CircuitContext<PS>,
                  newSequencer_0: bigint): __compactRuntime.CircuitResults<PS, boolean>;
  getContractInfo(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, [bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint,
                                                                                                      bigint]>;
}

export type Ledger = {
  readonly stateRoot: bigint;
  readonly lastBatchId: bigint;
  readonly batchCount: bigint;
  readonly sequencerAddress: bigint;
  readonly owner: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               sequencerAddr_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
