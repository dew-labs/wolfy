import { Model } from '@snapshot-labs/checkpoint';

export class Order extends Model {
  static tableName = 'orders';

  constructor(id: string) {
    super(Order.tableName);

    this.initialSet('id', id);
    this.initialSet('author', "");
    this.initialSet('key', "");
    this.initialSet('market', "");
    this.initialSet('order_type', "");
    this.initialSet('is_long', false);
    this.initialSet('index_token_address', "");
    this.initialSet('index_token_decimals', 0);
    this.initialSet('trigger_price', "");
    this.initialSet('acceptable_price', "");
    this.initialSet('is_executed', false);
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

  get author(): string {
    return this.get('author');
  }

  set author(value: string) {
    this.set('author', value);
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

  get index_token_address(): string {
    return this.get('index_token_address');
  }

  set index_token_address(value: string) {
    this.set('index_token_address', value);
  }

  get index_token_decimals(): number {
    return this.get('index_token_decimals');
  }

  set index_token_decimals(value: number) {
    this.set('index_token_decimals', value);
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

  get is_executed(): boolean {
    return this.get('is_executed');
  }

  set is_executed(value: boolean) {
    this.set('is_executed', value);
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
