export interface EscrowAdapter {
  create(params: any): Promise<any>;
  release(params: any): Promise<any>;
  refund?(params: any): Promise<any>;
}
