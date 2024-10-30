import { Model } from '@snapshot-labs/checkpoint';

export class Market extends Model {
  static tableName = 'markets';

  constructor(id: string) {
    super(Market.tableName);

    this.initialSet('id', id);
    this.initialSet('creator', "");
    this.initialSet('market_token', "");
    this.initialSet('index_token', "");
    this.initialSet('long_token', "");
    this.initialSet('short_token', "");
    this.initialSet('market_type', "");
  }

  static async loadEntity(id: string): Promise<Market | null> {
    const entity = await super._loadEntity(Market.tableName, id);
    if (!entity) return null;

    const model = new Market(id);
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

  get creator(): string {
    return this.get('creator');
  }

  set creator(value: string) {
    this.set('creator', value);
  }

  get market_token(): string {
    return this.get('market_token');
  }

  set market_token(value: string) {
    this.set('market_token', value);
  }

  get index_token(): string {
    return this.get('index_token');
  }

  set index_token(value: string) {
    this.set('index_token', value);
  }

  get long_token(): string {
    return this.get('long_token');
  }

  set long_token(value: string) {
    this.set('long_token', value);
  }

  get short_token(): string {
    return this.get('short_token');
  }

  set short_token(value: string) {
    this.set('short_token', value);
  }

  get market_type(): string {
    return this.get('market_type');
  }

  set market_type(value: string) {
    this.set('market_type', value);
  }
}

export class Order extends Model {
  static tableName = 'orders';

  constructor(id: string) {
    super(Order.tableName);

    this.initialSet('id', id);
    this.initialSet('key', "");
    this.initialSet('account', "");
    this.initialSet('receiver', "");
    this.initialSet('market', "");
    this.initialSet('action', 0);
    this.initialSet('order_type', "");
    this.initialSet('is_long', false);
    this.initialSet('trigger_price', "0");
    this.initialSet('acceptable_price', "0");
    this.initialSet('size_delta_usd', "0");
    this.initialSet('initial_collateral_token', "");
    this.initialSet('initial_collateral_delta_amount', "0");
    this.initialSet('is_frozen', false);
    this.initialSet('swap_path', []);
    this.initialSet('decrease_position_swap_type', "");
    this.initialSet('execution_fee', "0");
    this.initialSet('ui_fee_receiver', "");
    this.initialSet('callback_contract', "");
    this.initialSet('callback_gas_limit', "0");
    this.initialSet('min_output_amount', "0");
    this.initialSet('cancelled_reason', null);
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

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get receiver(): string {
    return this.get('receiver');
  }

  set receiver(value: string) {
    this.set('receiver', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get action(): number {
    return this.get('action');
  }

  set action(value: number) {
    this.set('action', value);
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

  get size_delta_usd(): string {
    return this.get('size_delta_usd');
  }

  set size_delta_usd(value: string) {
    this.set('size_delta_usd', value);
  }

  get initial_collateral_token(): string {
    return this.get('initial_collateral_token');
  }

  set initial_collateral_token(value: string) {
    this.set('initial_collateral_token', value);
  }

  get initial_collateral_delta_amount(): string {
    return this.get('initial_collateral_delta_amount');
  }

  set initial_collateral_delta_amount(value: string) {
    this.set('initial_collateral_delta_amount', value);
  }

  get is_frozen(): boolean {
    return this.get('is_frozen');
  }

  set is_frozen(value: boolean) {
    this.set('is_frozen', value);
  }

  get swap_path(): string[] {
    return JSON.parse(this.get('swap_path'));
  }

  set swap_path(value: string[]) {
    this.set('swap_path', JSON.stringify(value));
  }

  get decrease_position_swap_type(): string {
    return this.get('decrease_position_swap_type');
  }

  set decrease_position_swap_type(value: string) {
    this.set('decrease_position_swap_type', value);
  }

  get execution_fee(): string {
    return this.get('execution_fee');
  }

  set execution_fee(value: string) {
    this.set('execution_fee', value);
  }

  get ui_fee_receiver(): string {
    return this.get('ui_fee_receiver');
  }

  set ui_fee_receiver(value: string) {
    this.set('ui_fee_receiver', value);
  }

  get callback_contract(): string {
    return this.get('callback_contract');
  }

  set callback_contract(value: string) {
    this.set('callback_contract', value);
  }

  get callback_gas_limit(): string {
    return this.get('callback_gas_limit');
  }

  set callback_gas_limit(value: string) {
    this.set('callback_gas_limit', value);
  }

  get min_output_amount(): string {
    return this.get('min_output_amount');
  }

  set min_output_amount(value: string) {
    this.set('min_output_amount', value);
  }

  get cancelled_reason(): string | null {
    return this.get('cancelled_reason');
  }

  set cancelled_reason(value: string | null) {
    this.set('cancelled_reason', value);
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
    this.initialSet('key', "");
    this.initialSet('order_key', "");
    this.initialSet('account', "");
    this.initialSet('market', "");
    this.initialSet('action', 0);
    this.initialSet('is_long', false);
    this.initialSet('execution_price', "0");
    this.initialSet('base_pnl_usd', null);
    this.initialSet('uncapped_base_pnl_usd', null);
    this.initialSet('size_in_tokens', "0");
    this.initialSet('size_in_usd', "0");
    this.initialSet('size_delta_in_tokens', "0");
    this.initialSet('size_delta_usd', "0");
    this.initialSet('index_token_price_min', "0");
    this.initialSet('index_token_price_max', "0");
    this.initialSet('collateral_token', "");
    this.initialSet('collateral_token_price_min', "0");
    this.initialSet('collateral_token_price_max', "0");
    this.initialSet('collateral_amount', "0");
    this.initialSet('collateral_delta_amount', "0");
    this.initialSet('price_impact_amount', "0");
    this.initialSet('price_impact_usd', "0");
    this.initialSet('price_impact_diff_usd', null);
    this.initialSet('borrowing_factor', "0");
    this.initialSet('funding_fee_amount_per_size', "0");
    this.initialSet('long_token_claimable_funding_amount_per_size', "0");
    this.initialSet('short_token_claimable_funding_amount_per_size', "0");
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

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get order_key(): string {
    return this.get('order_key');
  }

  set order_key(value: string) {
    this.set('order_key', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get action(): number {
    return this.get('action');
  }

  set action(value: number) {
    this.set('action', value);
  }

  get is_long(): boolean {
    return this.get('is_long');
  }

  set is_long(value: boolean) {
    this.set('is_long', value);
  }

  get execution_price(): string {
    return this.get('execution_price');
  }

  set execution_price(value: string) {
    this.set('execution_price', value);
  }

  get base_pnl_usd(): string | null {
    return this.get('base_pnl_usd');
  }

  set base_pnl_usd(value: string | null) {
    this.set('base_pnl_usd', value);
  }

  get uncapped_base_pnl_usd(): string | null {
    return this.get('uncapped_base_pnl_usd');
  }

  set uncapped_base_pnl_usd(value: string | null) {
    this.set('uncapped_base_pnl_usd', value);
  }

  get size_in_tokens(): string {
    return this.get('size_in_tokens');
  }

  set size_in_tokens(value: string) {
    this.set('size_in_tokens', value);
  }

  get size_in_usd(): string {
    return this.get('size_in_usd');
  }

  set size_in_usd(value: string) {
    this.set('size_in_usd', value);
  }

  get size_delta_in_tokens(): string {
    return this.get('size_delta_in_tokens');
  }

  set size_delta_in_tokens(value: string) {
    this.set('size_delta_in_tokens', value);
  }

  get size_delta_usd(): string {
    return this.get('size_delta_usd');
  }

  set size_delta_usd(value: string) {
    this.set('size_delta_usd', value);
  }

  get index_token_price_min(): string {
    return this.get('index_token_price_min');
  }

  set index_token_price_min(value: string) {
    this.set('index_token_price_min', value);
  }

  get index_token_price_max(): string {
    return this.get('index_token_price_max');
  }

  set index_token_price_max(value: string) {
    this.set('index_token_price_max', value);
  }

  get collateral_token(): string {
    return this.get('collateral_token');
  }

  set collateral_token(value: string) {
    this.set('collateral_token', value);
  }

  get collateral_token_price_min(): string {
    return this.get('collateral_token_price_min');
  }

  set collateral_token_price_min(value: string) {
    this.set('collateral_token_price_min', value);
  }

  get collateral_token_price_max(): string {
    return this.get('collateral_token_price_max');
  }

  set collateral_token_price_max(value: string) {
    this.set('collateral_token_price_max', value);
  }

  get collateral_amount(): string {
    return this.get('collateral_amount');
  }

  set collateral_amount(value: string) {
    this.set('collateral_amount', value);
  }

  get collateral_delta_amount(): string {
    return this.get('collateral_delta_amount');
  }

  set collateral_delta_amount(value: string) {
    this.set('collateral_delta_amount', value);
  }

  get price_impact_amount(): string {
    return this.get('price_impact_amount');
  }

  set price_impact_amount(value: string) {
    this.set('price_impact_amount', value);
  }

  get price_impact_usd(): string {
    return this.get('price_impact_usd');
  }

  set price_impact_usd(value: string) {
    this.set('price_impact_usd', value);
  }

  get price_impact_diff_usd(): string | null {
    return this.get('price_impact_diff_usd');
  }

  set price_impact_diff_usd(value: string | null) {
    this.set('price_impact_diff_usd', value);
  }

  get borrowing_factor(): string {
    return this.get('borrowing_factor');
  }

  set borrowing_factor(value: string) {
    this.set('borrowing_factor', value);
  }

  get funding_fee_amount_per_size(): string {
    return this.get('funding_fee_amount_per_size');
  }

  set funding_fee_amount_per_size(value: string) {
    this.set('funding_fee_amount_per_size', value);
  }

  get long_token_claimable_funding_amount_per_size(): string {
    return this.get('long_token_claimable_funding_amount_per_size');
  }

  set long_token_claimable_funding_amount_per_size(value: string) {
    this.set('long_token_claimable_funding_amount_per_size', value);
  }

  get short_token_claimable_funding_amount_per_size(): string {
    return this.get('short_token_claimable_funding_amount_per_size');
  }

  set short_token_claimable_funding_amount_per_size(value: string) {
    this.set('short_token_claimable_funding_amount_per_size', value);
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

export class Deposit extends Model {
  static tableName = 'deposits';

  constructor(id: string) {
    super(Deposit.tableName);

    this.initialSet('id', id);
    this.initialSet('key', "");
    this.initialSet('account', "");
    this.initialSet('receiver', "");
    this.initialSet('market', "");
    this.initialSet('action', 0);
    this.initialSet('long_token', "");
    this.initialSet('short_token', "");
    this.initialSet('long_token_amount', "0");
    this.initialSet('short_token_amount', "0");
    this.initialSet('long_token_swap_path', []);
    this.initialSet('short_token_swap_path', []);
    this.initialSet('min_market_tokens', "0");
    this.initialSet('received_market_tokens', null);
    this.initialSet('execution_fee', "0");
    this.initialSet('callback_contract', "");
    this.initialSet('callback_gas_limit', "0");
    this.initialSet('tx_hash', "");
    this.initialSet('created_at', 0);
    this.initialSet('created_at_block', 0);
  }

  static async loadEntity(id: string): Promise<Deposit | null> {
    const entity = await super._loadEntity(Deposit.tableName, id);
    if (!entity) return null;

    const model = new Deposit(id);
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

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get receiver(): string {
    return this.get('receiver');
  }

  set receiver(value: string) {
    this.set('receiver', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get action(): number {
    return this.get('action');
  }

  set action(value: number) {
    this.set('action', value);
  }

  get long_token(): string {
    return this.get('long_token');
  }

  set long_token(value: string) {
    this.set('long_token', value);
  }

  get short_token(): string {
    return this.get('short_token');
  }

  set short_token(value: string) {
    this.set('short_token', value);
  }

  get long_token_amount(): string {
    return this.get('long_token_amount');
  }

  set long_token_amount(value: string) {
    this.set('long_token_amount', value);
  }

  get short_token_amount(): string {
    return this.get('short_token_amount');
  }

  set short_token_amount(value: string) {
    this.set('short_token_amount', value);
  }

  get long_token_swap_path(): string[] {
    return JSON.parse(this.get('long_token_swap_path'));
  }

  set long_token_swap_path(value: string[]) {
    this.set('long_token_swap_path', JSON.stringify(value));
  }

  get short_token_swap_path(): string[] {
    return JSON.parse(this.get('short_token_swap_path'));
  }

  set short_token_swap_path(value: string[]) {
    this.set('short_token_swap_path', JSON.stringify(value));
  }

  get min_market_tokens(): string {
    return this.get('min_market_tokens');
  }

  set min_market_tokens(value: string) {
    this.set('min_market_tokens', value);
  }

  get received_market_tokens(): string | null {
    return this.get('received_market_tokens');
  }

  set received_market_tokens(value: string | null) {
    this.set('received_market_tokens', value);
  }

  get execution_fee(): string {
    return this.get('execution_fee');
  }

  set execution_fee(value: string) {
    this.set('execution_fee', value);
  }

  get callback_contract(): string {
    return this.get('callback_contract');
  }

  set callback_contract(value: string) {
    this.set('callback_contract', value);
  }

  get callback_gas_limit(): string {
    return this.get('callback_gas_limit');
  }

  set callback_gas_limit(value: string) {
    this.set('callback_gas_limit', value);
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

export class Withdrawal extends Model {
  static tableName = 'withdrawals';

  constructor(id: string) {
    super(Withdrawal.tableName);

    this.initialSet('id', id);
    this.initialSet('key', "");
    this.initialSet('account', "");
    this.initialSet('receiver', "");
    this.initialSet('market', "");
    this.initialSet('action', 0);
    this.initialSet('min_long_token_amount', "0");
    this.initialSet('min_short_token_amount', "0");
    this.initialSet('long_token_swap_path', []);
    this.initialSet('short_token_swap_path', []);
    this.initialSet('market_token_amount', "0");
    this.initialSet('execution_fee', "");
    this.initialSet('callback_contract', "");
    this.initialSet('callback_gas_limit', "");
    this.initialSet('tx_hash', "");
    this.initialSet('created_at', 0);
    this.initialSet('created_at_block', 0);
  }

  static async loadEntity(id: string): Promise<Withdrawal | null> {
    const entity = await super._loadEntity(Withdrawal.tableName, id);
    if (!entity) return null;

    const model = new Withdrawal(id);
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

  get key(): string {
    return this.get('key');
  }

  set key(value: string) {
    this.set('key', value);
  }

  get account(): string {
    return this.get('account');
  }

  set account(value: string) {
    this.set('account', value);
  }

  get receiver(): string {
    return this.get('receiver');
  }

  set receiver(value: string) {
    this.set('receiver', value);
  }

  get market(): string {
    return this.get('market');
  }

  set market(value: string) {
    this.set('market', value);
  }

  get action(): number {
    return this.get('action');
  }

  set action(value: number) {
    this.set('action', value);
  }

  get min_long_token_amount(): string {
    return this.get('min_long_token_amount');
  }

  set min_long_token_amount(value: string) {
    this.set('min_long_token_amount', value);
  }

  get min_short_token_amount(): string {
    return this.get('min_short_token_amount');
  }

  set min_short_token_amount(value: string) {
    this.set('min_short_token_amount', value);
  }

  get long_token_swap_path(): string[] {
    return JSON.parse(this.get('long_token_swap_path'));
  }

  set long_token_swap_path(value: string[]) {
    this.set('long_token_swap_path', JSON.stringify(value));
  }

  get short_token_swap_path(): string[] {
    return JSON.parse(this.get('short_token_swap_path'));
  }

  set short_token_swap_path(value: string[]) {
    this.set('short_token_swap_path', JSON.stringify(value));
  }

  get market_token_amount(): string {
    return this.get('market_token_amount');
  }

  set market_token_amount(value: string) {
    this.set('market_token_amount', value);
  }

  get execution_fee(): string {
    return this.get('execution_fee');
  }

  set execution_fee(value: string) {
    this.set('execution_fee', value);
  }

  get callback_contract(): string {
    return this.get('callback_contract');
  }

  set callback_contract(value: string) {
    this.set('callback_contract', value);
  }

  get callback_gas_limit(): string {
    return this.get('callback_gas_limit');
  }

  set callback_gas_limit(value: string) {
    this.set('callback_gas_limit', value);
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
