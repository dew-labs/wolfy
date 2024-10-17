import { Model } from '@snapshot-labs/checkpoint';

export class Order extends Model {
  static tableName = 'orders';

  constructor(id: string) {
    super(Order.tableName);

    this.initialSet('id', id);
    this.initialSet('account', "");
    this.initialSet('action', null);
    this.initialSet('key', "");
    this.initialSet('market', "");
    this.initialSet('order_type', "");
    this.initialSet('is_long', false);
    this.initialSet('initial_collateral_token', "");
    this.initialSet('index_token_address', "");
    this.initialSet('size_delta_usd', "0");
    this.initialSet('trigger_price', "0");
    this.initialSet('acceptable_price', "0");
    this.initialSet('tx_hash', "");
    this.initialSet('created_at', 0);
    this.initialSet('created_at_block', 0);
  }

  static async loadEntity(id: string): Promise<Order | null> {
    const entity = await super._loadEntity(Order.tableName, id);
    if (!entity) return null;

    const model = new Order(id);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get action(): number | null {
    return this.get('action');
  }

  set action(value: number | null) {
    this.set('action', value);
  }

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get order_type(): string {
    return this.get('order_type');
  }

  set order_type(value: string) {
    this.set('order_type', value);
  }

  get is_long(): boolean {
    return this.get('is_long');
  }

  set is_long(value: boolean) {
    this.set('is_long', value);
  }

  get initial_collateral_token(): string {
    return this.get('initial_collateral_token');
  }

  set initial_collateral_token(value: string) {
    this.set('initial_collateral_token', value);
  }

  get index_token_address(): string {
    return this.get('index_token_address');
  }

  set index_token_address(value: string) {
    this.set('index_token_address', value);
  }

  get size_delta_usd(): string {
    return this.get('size_delta_usd');
  }

  set size_delta_usd(value: string) {
    this.set('size_delta_usd', value);
  }

  get trigger_price(): string {
    return this.get('trigger_price');
  }

  set trigger_price(value: string) {
    this.set('trigger_price', value);
  }

  get acceptable_price(): string {
    return this.get('acceptable_price');
  }

  set acceptable_price(value: string) {
    this.set('acceptable_price', value);
  }

  get tx_hash(): string {
    return this.get('tx_hash');
  }

  set tx_hash(value: string) {
    this.set('tx_hash', value);
  }

  get created_at(): number {
    return this.get('created_at');
  }

  set created_at(value: number) {
    this.set('created_at', value);
  }

  get created_at_block(): number {
    return this.get('created_at_block');
  }

  set created_at_block(value: number) {
    this.set('created_at_block', value);
  }
}

export class Position extends Model {
  static tableName = 'positions';

  constructor(id: string) {
    super(Position.tableName);

    this.initialSet('id', id);
    this.initialSet('account', "");
    this.initialSet('key', "");
    this.initialSet('market', "");
    this.initialSet('is_long', false);
    this.initialSet('collateral_amount', "");
    this.initialSet('collateral_token', "");
    this.initialSet('size_in_usd', "0");
    this.initialSet('size_delta_usd', "0");
    this.initialSet('size_in_tokens', "0");
    this.initialSet('tx_hash', "");
    this.initialSet('created_at', 0);
    this.initialSet('created_at_block', 0);
  }

  static async loadEntity(id: string): Promise<Position | null> {
    const entity = await super._loadEntity(Position.tableName, id);
    if (!entity) return null;

    const model = new Position(id);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get is_long(): boolean {
    return this.get('is_long');
  }

  set is_long(value: boolean) {
    this.set('is_long', value);
  }

  get collateral_amount(): string {
    return this.get('collateral_amount');
  }

  set collateral_amount(value: string) {
    this.set('collateral_amount', value);
  }

  get collateral_token(): string {
    return this.get('collateral_token');
  }

  set collateral_token(value: string) {
    this.set('collateral_token', value);
  }

  get size_in_usd(): string {
    return this.get('size_in_usd');
  }

  set size_in_usd(value: string) {
    this.set('size_in_usd', value);
  }

  get size_delta_usd(): string {
    return this.get('size_delta_usd');
  }

  set size_delta_usd(value: string) {
    this.set('size_delta_usd', value);
  }

  get size_in_tokens(): string {
    return this.get('size_in_tokens');
  }

  set size_in_tokens(value: string) {
    this.set('size_in_tokens', value);
  }

  get tx_hash(): string {
    return this.get('tx_hash');
  }

  set tx_hash(value: string) {
    this.set('tx_hash', value);
  }

  get created_at(): number {
    return this.get('created_at');
  }

  set created_at(value: number) {
    this.set('created_at', value);
  }

  get created_at_block(): number {
    return this.get('created_at_block');
  }

  set created_at_block(value: number) {
    this.set('created_at_block', value);
  }
}

export class TradeHistory extends Model {
  static tableName = 'tradehistories';

  constructor(id: string) {
    super(TradeHistory.tableName);

    this.initialSet('id', id);
    this.initialSet('account', "");
    this.initialSet('key', "");
    this.initialSet('action', 0);
    this.initialSet('market', "");
    this.initialSet('is_long', false);
    this.initialSet('order_size_usd', null);
    this.initialSet('order_price', null);
    this.initialSet('deposit_long_token_amount', null);
    this.initialSet('deposit_short_token_amount', null);
    this.initialSet('pool_market_token_amount', null);
    this.initialSet('tx_hash', "");
    this.initialSet('created_at', 0);
    this.initialSet('created_at_block', 0);
  }

  static async loadEntity(id: string): Promise<TradeHistory | null> {
    const entity = await super._loadEntity(TradeHistory.tableName, id);
    if (!entity) return null;

    const model = new TradeHistory(id);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get action(): number {
    return this.get('action');
  }

  set action(value: number) {
    this.set('action', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get is_long(): boolean {
    return this.get('is_long');
  }

  set is_long(value: boolean) {
    this.set('is_long', value);
  }

  get order_size_usd(): string | null {
    return this.get('order_size_usd');
  }

  set order_size_usd(value: string | null) {
    this.set('order_size_usd', value);
  }

  get order_price(): string | null {
    return this.get('order_price');
  }

  set order_price(value: string | null) {
    this.set('order_price', value);
  }

  get deposit_long_token_amount(): string | null {
    return this.get('deposit_long_token_amount');
  }

  set deposit_long_token_amount(value: string | null) {
    this.set('deposit_long_token_amount', value);
  }

  get deposit_short_token_amount(): string | null {
    return this.get('deposit_short_token_amount');
  }

  set deposit_short_token_amount(value: string | null) {
    this.set('deposit_short_token_amount', value);
  }

  get pool_market_token_amount(): string | null {
    return this.get('pool_market_token_amount');
  }

  set pool_market_token_amount(value: string | null) {
    this.set('pool_market_token_amount', value);
  }

  get tx_hash(): string {
    return this.get('tx_hash');
  }

  set tx_hash(value: string) {
    this.set('tx_hash', value);
  }

  get created_at(): number {
    return this.get('created_at');
  }

  set created_at(value: number) {
    this.set('created_at', value);
  }

  get created_at_block(): number {
    return this.get('created_at_block');
  }

  set created_at_block(value: number) {
    this.set('created_at_block', value);
  }
}
