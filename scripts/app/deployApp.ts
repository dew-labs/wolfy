import { Account, hash, Contract, json, Calldata, CallData, RpcProvider, shortString } from "starknet"
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

async function deploy() {
    // connect provider
    const providerUrl = process.env.PROVIDER_URL
    const provider = new RpcProvider({ nodeUrl: providerUrl! })
    // connect your account. To adapt to your own account :
    const privateKey0: string = process.env.ACCOUNT_PRIVATE as string
    const account0Address: string = process.env.ACCOUNT_PUBLIC as string
    const account0 = new Account(provider, account0Address!, privateKey0!)
    console.log("Deploying with Account: " + account0Address)
    const resp = await provider.getSpecVersion();
    console.log('rpc version =', resp);

    // -------------------------------------------------------------------------

    let roleStoreAddress = process.env.ROLE_STORE
    const compiledRoleStoreSierra = json.parse(fs.readFileSync( "./target/dev/satoru_RoleStore.contract_class.json").toString( "ascii"))

    if (!roleStoreAddress) {
        const compiledRoleStoreCasm = json.parse(fs.readFileSync( "./target/dev/satoru_RoleStore.compiled_contract_class.json").toString( "ascii"))
        const roleStoreCallData: CallData = new CallData(compiledRoleStoreSierra.abi)
        const roleStoreConstructor: Calldata = roleStoreCallData.compile("constructor", { admin: account0.address })
        const deployRoleStoreResponse = await account0.declareAndDeploy({
            contract: compiledRoleStoreSierra,
            casm: compiledRoleStoreCasm,
            constructorCalldata: roleStoreConstructor
        })
        console.log("RoleStore Deployed: " + deployRoleStoreResponse.deploy.contract_address)
        roleStoreAddress = deployRoleStoreResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let dataStoreAddress = process.env.DATA_STORE

    if (!dataStoreAddress) {
        const compiledDataStoreCasm = json.parse(fs.readFileSync( "./target/dev/satoru_DataStore.compiled_contract_class.json").toString( "ascii"))
        const compiledDataStoreSierra = json.parse(fs.readFileSync( "./target/dev/satoru_DataStore.contract_class.json").toString( "ascii"))
        const dataStoreCallData: CallData = new CallData(compiledDataStoreSierra.abi)
        const dataStoreConstructor: Calldata = dataStoreCallData.compile("constructor", {
            role_store_address: roleStoreAddress
        })
        const deployDataStoreResponse = await account0.declareAndDeploy({
            contract: compiledDataStoreSierra,
            casm: compiledDataStoreCasm ,
            constructorCalldata: dataStoreConstructor,
        })
        console.log("DataStore Deployed: " + deployDataStoreResponse.deploy.contract_address)
        dataStoreAddress = deployDataStoreResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    const roleStoreContract = new Contract(compiledRoleStoreSierra.abi, roleStoreAddress, provider)
    roleStoreContract.connect(account0);
    const roleCall = roleStoreContract.populate("grant_role", [account0.address, shortString.encodeShortString("CONTROLLER")])
    const grant_role_tx = await roleStoreContract.grant_role(roleCall.calldata)
    await provider.waitForTransaction(grant_role_tx.transaction_hash)
    console.log("Controller role granted.")

    // -------------------------------------------------------------------------

    let eventEmitterAddress = process.env.EVENT_EMITTER

    if (!eventEmitterAddress) {
        const compiledEventEmitterCasm = json.parse(fs.readFileSync( "./target/dev/satoru_EventEmitter.compiled_contract_class.json").toString( "ascii"))
        const compiledEventEmitterSierra = json.parse(fs.readFileSync( "./target/dev/satoru_EventEmitter.contract_class.json").toString( "ascii"))
        const eventEmitterCallData: CallData = new CallData(compiledEventEmitterSierra.abi)
        const eventEmitterConstructor: Calldata = eventEmitterCallData.compile("constructor", {})
        const deployEventEmitterResponse = await account0.declareAndDeploy({
            contract: compiledEventEmitterSierra,
            casm: compiledEventEmitterCasm ,
            constructorCalldata: eventEmitterConstructor,
        })
        console.log("EventEmitter Deployed: " + deployEventEmitterResponse.deploy.contract_address)
        eventEmitterAddress = deployEventEmitterResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let oracleStoreAddress = process.env.ORACLE_STORE

    if (!oracleStoreAddress) {
        const compiledOracleStoreCasm = json.parse(fs.readFileSync( "./target/dev/satoru_OracleStore.compiled_contract_class.json").toString( "ascii"))
        const compiledOracleStoreSierra = json.parse(fs.readFileSync( "./target/dev/satoru_OracleStore.contract_class.json").toString( "ascii"))
        const oracleStoreCallData: CallData = new CallData(compiledOracleStoreSierra.abi)
        const oracleStoreConstructor: Calldata = oracleStoreCallData.compile("constructor", {
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress
        })
        const deployOracleStoreResponse = await account0.declareAndDeploy({
            contract: compiledOracleStoreSierra,
            casm: compiledOracleStoreCasm ,
            constructorCalldata: oracleStoreConstructor,
        })
        console.log("OracleStore Deployed: " + deployOracleStoreResponse.deploy.contract_address)
        oracleStoreAddress = deployOracleStoreResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let oracleAddress = process.env.ORACLE

    if (!oracleAddress) {
        const compiledOracleCasm = json.parse(fs.readFileSync( "./target/dev/satoru_Oracle.compiled_contract_class.json").toString( "ascii"))
        const compiledOracleSierra = json.parse(fs.readFileSync( "./target/dev/satoru_Oracle.contract_class.json").toString( "ascii"))
        const oracleCallData: CallData = new CallData(compiledOracleSierra.abi)
        const oracleConstructor: Calldata = oracleCallData.compile("constructor", {
            role_store_address: roleStoreAddress,
            oracle_store_address: oracleStoreAddress,
            pragma_address: account0.address
        })
        const deployOracleResponse = await account0.declareAndDeploy({
            contract: compiledOracleSierra,
            casm: compiledOracleCasm ,
            constructorCalldata: oracleConstructor,
        })
        console.log("Oracle Deployed: " + deployOracleResponse.deploy.contract_address)
        oracleAddress = deployOracleResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let orderVaultAddress = process.env.ORDER_VAULT

    if (!orderVaultAddress) {
        const compiledOrderVaultCasm = json.parse(fs.readFileSync( "./target/dev/satoru_OrderVault.compiled_contract_class.json").toString( "ascii"))
        const compiledOrderVaultSierra = json.parse(fs.readFileSync( "./target/dev/satoru_OrderVault.contract_class.json").toString( "ascii"))
        const orderVaultCallData: CallData = new CallData(compiledOrderVaultSierra.abi)
        const orderVaultConstructor: Calldata = orderVaultCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
        })
        const deployOrderVaultResponse = await account0.declareAndDeploy({
            contract: compiledOrderVaultSierra,
            casm: compiledOrderVaultCasm ,
            constructorCalldata: orderVaultConstructor,
        })
        console.log("OrderVault Deployed: " + deployOrderVaultResponse.deploy.contract_address)
        orderVaultAddress = deployOrderVaultResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let swapHandlerAddress = process.env.SWAP_HANDLER

    if (!swapHandlerAddress) {
        const compiledSwapHandlerCasm = json.parse(fs.readFileSync( "./target/dev/satoru_SwapHandler.compiled_contract_class.json").toString( "ascii"))
        const compiledSwapHandlerSierra = json.parse(fs.readFileSync( "./target/dev/satoru_SwapHandler.contract_class.json").toString( "ascii"))
        const swapHandlerCallData: CallData = new CallData(compiledSwapHandlerSierra.abi)
        const swapHandlerConstructor: Calldata = swapHandlerCallData.compile("constructor", {
            role_store_address: roleStoreAddress,
        })
        const deploySwapHandlerResponse = await account0.declareAndDeploy({
            contract: compiledSwapHandlerSierra,
            casm: compiledSwapHandlerCasm ,
            constructorCalldata: swapHandlerConstructor,
        })
        console.log("SwapHandler Deployed: " + deploySwapHandlerResponse.deploy.contract_address)
        swapHandlerAddress = deploySwapHandlerResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let referralStorageAddress = process.env.REFERRAL_STORAGE

    if (!referralStorageAddress) {
        const compiledReferralStorageCasm = json.parse(fs.readFileSync( "./target/dev/satoru_ReferralStorage.compiled_contract_class.json").toString( "ascii"))
        const compiledReferralStorageSierra = json.parse(fs.readFileSync( "./target/dev/satoru_ReferralStorage.contract_class.json").toString( "ascii"))
        const referralStorageCallData: CallData = new CallData(compiledReferralStorageSierra.abi)
        const referralStorageConstructor: Calldata = referralStorageCallData.compile("constructor", {
            event_emitter_address: eventEmitterAddress,
        })
        const deployReferralStorageResponse = await account0.declareAndDeploy({
            contract: compiledReferralStorageSierra,
            casm: compiledReferralStorageCasm ,
            constructorCalldata: referralStorageConstructor,
        })
        console.log("ReferralStorage Deployed: " + deployReferralStorageResponse.deploy.contract_address)
        referralStorageAddress = deployReferralStorageResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let increaseOrderUtilsAddress = process.env.INCREASE_ORDER_UTILS
    let increaseOrderUtilsClassHash = process.env.INCREASE_ORDER_UTILS_CLASS_HASH

    if (!increaseOrderUtilsAddress || !increaseOrderUtilsClassHash) {

        const compiledIncreaseOrderUtilsCasm = json.parse(fs.readFileSync( "./target/dev/satoru_IncreaseOrderUtils.compiled_contract_class.json").toString( "ascii"))

        if (!increaseOrderUtilsAddress) {
            const compiledIncreaseOrderUtilsSierra = json.parse(fs.readFileSync( "./target/dev/satoru_IncreaseOrderUtils.contract_class.json").toString( "ascii"))
            const increaseOrderUtilsCallData: CallData = new CallData(compiledIncreaseOrderUtilsSierra.abi)
            const increaseOrderUtilsConstructor: Calldata = increaseOrderUtilsCallData.compile("constructor", {})
            const deployIncreaseOrderUtilsResponse = await account0.declareAndDeploy({
                contract: compiledIncreaseOrderUtilsSierra,
                casm: compiledIncreaseOrderUtilsCasm,
            })
            console.log("IncreaseOrderUtils Deployed: " + deployIncreaseOrderUtilsResponse.deploy.contract_address)
            console.log("IncreaseOrderUtils Class Hash: " + deployIncreaseOrderUtilsResponse.deploy.classHash)
            increaseOrderUtilsAddress = deployIncreaseOrderUtilsResponse.deploy.contract_address
            increaseOrderUtilsClassHash = deployIncreaseOrderUtilsResponse.deploy.classHash
        }

        if (!increaseOrderUtilsClassHash) {
            increaseOrderUtilsClassHash = hash.computeCompiledClassHash(compiledIncreaseOrderUtilsCasm)
        }
    }



    // -------------------------------------------------------------------------

    let decreaseOrderUtilsAddress = process.env.DECREASE_ORDER_UTILS
    let decreaseOrderUtilsClassHash = process.env.DECREASE_ORDER_UTILS_CLASS_HASH

    if (!decreaseOrderUtilsAddress || !decreaseOrderUtilsClassHash) {
        const compiledDecreaseOrderUtilsCasm = json.parse(fs.readFileSync( "./target/dev/satoru_DecreaseOrderUtils.compiled_contract_class.json").toString( "ascii"))

        if (!decreaseOrderUtilsAddress) {
            const compiledDecreaseOrderUtilsSierra = json.parse(fs.readFileSync( "./target/dev/satoru_DecreaseOrderUtils.contract_class.json").toString( "ascii"))
            const decreaseOrderUtilsCallData: CallData = new CallData(compiledDecreaseOrderUtilsSierra.abi)
            const decreaseOrderUtilsConstructor: Calldata = decreaseOrderUtilsCallData.compile("constructor", {})
            const deployDecreaseOrderUtilsResponse = await account0.declareAndDeploy({
                contract: compiledDecreaseOrderUtilsSierra,
                casm: compiledDecreaseOrderUtilsCasm,
            })
            console.log("DecreaseOrderUtils Deployed: " + deployDecreaseOrderUtilsResponse.deploy.contract_address)
            console.log("DecreaseOrderUtils Class Hash: " + deployDecreaseOrderUtilsResponse.deploy.classHash)
            decreaseOrderUtilsAddress = deployDecreaseOrderUtilsResponse.deploy.contract_address
            decreaseOrderUtilsClassHash = deployDecreaseOrderUtilsResponse.deploy.classHash
        }

        if (!decreaseOrderUtilsClassHash) {
            decreaseOrderUtilsClassHash = hash.computeCompiledClassHash(compiledDecreaseOrderUtilsCasm)
        }
    }

    // -------------------------------------------------------------------------

    let swapOrderUtilsAddress = process.env.SWAP_ORDER_UTILS
    let swapOrderUtilsClassHash = process.env.SWAP_ORDER_UTILS_CLASS_HASH

    if (!swapOrderUtilsAddress || !swapOrderUtilsClassHash) {
        const compiledSwapOrderUtilsCasm = json.parse(fs.readFileSync( "./target/dev/satoru_SwapOrderUtils.compiled_contract_class.json").toString( "ascii"))

        if (!swapOrderUtilsAddress) {
            const compiledSwapOrderUtilsSierra = json.parse(fs.readFileSync( "./target/dev/satoru_SwapOrderUtils.contract_class.json").toString( "ascii"))
            const swapOrderUtilsCallData: CallData = new CallData(compiledSwapOrderUtilsSierra.abi)
            const swapOrderUtilsConstructor: Calldata = swapOrderUtilsCallData.compile("constructor", {})
            const deploySwapOrderUtilsResponse = await account0.declareAndDeploy({
                contract: compiledSwapOrderUtilsSierra,
                casm: compiledSwapOrderUtilsCasm,
            })
            console.log("SwapOrderUtils Deployed: " + deploySwapOrderUtilsResponse.deploy.contract_address)
            console.log("SwapOrderUtils Class Hash: " + deploySwapOrderUtilsResponse.deploy.classHash)
            swapOrderUtilsAddress = deploySwapOrderUtilsResponse.deploy.contract_address
            swapOrderUtilsClassHash = deploySwapOrderUtilsResponse.deploy.classHash
        }

        if (!swapOrderUtilsClassHash) {
            swapOrderUtilsClassHash = hash.computeCompiledClassHash(compiledSwapOrderUtilsCasm)
        }
    }

    // -------------------------------------------------------------------------

    let orderUtilsAddress = process.env.ORDER_UTILS
    let orderUtilsClassHash = process.env.ORDER_UTILS_CLASS_HASH

    if (!orderUtilsAddress || !orderUtilsClassHash) {
        const compiledOrderUtilsCasm = json.parse(fs.readFileSync( "./target/dev/satoru_OrderUtils.compiled_contract_class.json").toString( "ascii"))

        if (!orderUtilsAddress) {
            const compiledOrderUtilsSierra = json.parse(fs.readFileSync( "./target/dev/satoru_OrderUtils.contract_class.json").toString( "ascii"))
            const orderUtilsCallData: CallData = new CallData(compiledOrderUtilsSierra.abi)
            const orderUtilsConstructor: Calldata = orderUtilsCallData.compile("constructor", {
                increase_order_class_hash: increaseOrderUtilsAddress,
                decrease_order_class_hash: decreaseOrderUtilsClassHash,
                swap_order_class_hash: swapOrderUtilsClassHash
            })
            const deployOrderUtilsResponse = await account0.declareAndDeploy({
                contract: compiledOrderUtilsSierra,
                casm: compiledOrderUtilsCasm,
                constructorCalldata: orderUtilsConstructor
            })
            console.log("OrderUtils Deployed: " + deployOrderUtilsResponse.deploy.contract_address)
            console.log("OrderUtils Class Hash: " + deployOrderUtilsResponse.deploy.classHash)
            orderUtilsAddress = deployOrderUtilsResponse.deploy.contract_address
            orderUtilsClassHash = deployOrderUtilsResponse.deploy.classHash
        }

        if (!orderUtilsClassHash) {
            orderUtilsClassHash = hash.computeCompiledClassHash(compiledOrderUtilsCasm)
        }
    }

    // -------------------------------------------------------------------------

    let orderHandlerAddress = process.env.ORDER_HANDLER

    if (!orderHandlerAddress) {
        const compiledOrderHandlerCasm = json.parse(fs.readFileSync( "./target/dev/satoru_OrderHandler.compiled_contract_class.json").toString( "ascii"))
        const compiledOrderHandlerSierra = json.parse(fs.readFileSync( "./target/dev/satoru_OrderHandler.contract_class.json").toString( "ascii"))
        const orderHandlerCallData: CallData = new CallData(compiledOrderHandlerSierra.abi)
        const orderHandlerConstructor: Calldata = orderHandlerCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress,
            order_vault_address: orderVaultAddress,
            oracle_address: oracleAddress,
            swap_handler_address: swapHandlerAddress,
            referral_storage_address: referralStorageAddress,
            order_utils_class_hash: orderUtilsClassHash,
            increase_order_utils_class_hash: increaseOrderUtilsClassHash,
            decrease_order_utils_class_hash: decreaseOrderUtilsClassHash,
            swap_order_utils_class_hash: swapOrderUtilsClassHash,
        })
        const deployOrderHandlerResponse = await account0.declareAndDeploy({
            contract: compiledOrderHandlerSierra,
            casm: compiledOrderHandlerCasm ,
            constructorCalldata: orderHandlerConstructor,
        })
        console.log("OrderHandler Deployed: " + deployOrderHandlerResponse.deploy.contract_address)
        orderHandlerAddress = deployOrderHandlerResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let depositVaultAddress = process.env.DEPOSIT_VAULT

    if (!depositVaultAddress) {
        const compiledDepositVaultCasm = json.parse(fs.readFileSync( "./target/dev/satoru_DepositVault.compiled_contract_class.json").toString( "ascii"))
        const compiledDepositVaultSierra = json.parse(fs.readFileSync( "./target/dev/satoru_DepositVault.contract_class.json").toString( "ascii"))
        const depositVaultCallData: CallData = new CallData(compiledDepositVaultSierra.abi)
        const depositVaultConstructor: Calldata = depositVaultCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
        })
        const deployDepositVaultResponse = await account0.declareAndDeploy({
            contract: compiledDepositVaultSierra,
            casm: compiledDepositVaultCasm ,
            constructorCalldata: depositVaultConstructor,
        })
        console.log("DepositVault Deployed: " + deployDepositVaultResponse.deploy.contract_address)
        depositVaultAddress = deployDepositVaultResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let depositHandlerAddress = process.env.DEPOSIT_HANDLER

    if (!depositHandlerAddress) {
        const compiledDepositHandlerCasm = json.parse(fs.readFileSync( "./target/dev/satoru_DepositHandler.compiled_contract_class.json").toString( "ascii"))
        const compiledDepositHandlerSierra = json.parse(fs.readFileSync( "./target/dev/satoru_DepositHandler.contract_class.json").toString( "ascii"))
        const depositHandlerCallData: CallData = new CallData(compiledDepositHandlerSierra.abi)
        const depositHandlerConstructor: Calldata = depositHandlerCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress,
            deposit_vault_address: depositVaultAddress,
            oracle_address: oracleAddress,
        })
        const deployDepositHandlerResponse = await account0.declareAndDeploy({
            contract: compiledDepositHandlerSierra,
            casm: compiledDepositHandlerCasm ,
            constructorCalldata: depositHandlerConstructor,
        })
        console.log("DepositHandler Deployed: " + deployDepositHandlerResponse.deploy.contract_address)
        depositHandlerAddress = deployDepositHandlerResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let withdrawalVaultAddress = process.env.WITHDRAWAL_VAULT

    if (!withdrawalVaultAddress) {
        const compiledWithdrawalVaultCasm = json.parse(fs.readFileSync( "./target/dev/satoru_WithdrawalVault.compiled_contract_class.json").toString( "ascii"))
        const compiledWithdrawalVaultSierra = json.parse(fs.readFileSync( "./target/dev/satoru_WithdrawalVault.contract_class.json").toString( "ascii"))
        const withdrawalVaultCallData: CallData = new CallData(compiledWithdrawalVaultSierra.abi)
        const withdrawalVaultConstructor: Calldata = withdrawalVaultCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
        })
        const deployWithdrawalVaultResponse = await account0.declareAndDeploy({
            contract: compiledWithdrawalVaultSierra,
            casm: compiledWithdrawalVaultCasm ,
            constructorCalldata: withdrawalVaultConstructor,
        })
        console.log("WithdrawalVault Deployed: " + deployWithdrawalVaultResponse.deploy.contract_address)
        withdrawalVaultAddress = deployWithdrawalVaultResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let withdrawalHandlerAddress = process.env.WITHDRAWAL_HANDLER

    if (!withdrawalHandlerAddress) {
        const compiledWithdrawalHandlerCasm = json.parse(fs.readFileSync( "./target/dev/satoru_WithdrawalHandler.compiled_contract_class.json").toString( "ascii"))
        const compiledWithdrawalHandlerSierra = json.parse(fs.readFileSync( "./target/dev/satoru_WithdrawalHandler.contract_class.json").toString( "ascii"))
        const withdrawalHandlerCallData: CallData = new CallData(compiledWithdrawalHandlerSierra.abi)
        const withdrawalHandlerConstructor: Calldata = withdrawalHandlerCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress,
            withdrawal_vault_address: withdrawalVaultAddress,
            oracle_address: oracleAddress,
        })
        const deployWithdrawalHandlerResponse = await account0.declareAndDeploy({
            contract: compiledWithdrawalHandlerSierra,
            casm: compiledWithdrawalHandlerCasm ,
            constructorCalldata: withdrawalHandlerConstructor,
        })
        console.log("WithdrawalHandler Deployed: " + deployWithdrawalHandlerResponse.deploy.contract_address)
        withdrawalHandlerAddress = deployWithdrawalHandlerResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    const compiledMarketTokenCasm = json.parse(fs.readFileSync( "./target/dev/satoru_MarketToken.compiled_contract_class.json").toString( "ascii"))
    const compiledMarketTokenSierra = json.parse(fs.readFileSync( "./target/dev/satoru_MarketToken.contract_class.json").toString( "ascii"))
    try {
        await account0.declare({
            contract: compiledMarketTokenSierra,
            casm: compiledMarketTokenCasm
        })
        console.log("MarketToken Declared.")
    } catch (error) {
        console.log("MarketToken Already Declared.")
    }

    // -------------------------------------------------------------------------

    let marketFactoryAddress = process.env.MARKET_FACTORY

    if (!marketFactoryAddress) {
        const marketTokenClassHash = hash.computeCompiledClassHash(compiledMarketTokenCasm)
        const compiledMarketFactoryCasm = json.parse(fs.readFileSync( "./target/dev/satoru_MarketFactory.compiled_contract_class.json").toString( "ascii"))
        const compiledMarketFactorySierra = json.parse(fs.readFileSync( "./target/dev/satoru_MarketFactory.contract_class.json").toString( "ascii"))
        const marketFactoryCallData: CallData = new CallData(compiledMarketFactorySierra.abi)
        const marketFactoryConstructor: Calldata = marketFactoryCallData.compile("constructor", {
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress,
            market_token_class_hash: marketTokenClassHash
        })
        const deployMarketFactoryResponse = await account0.declareAndDeploy({
            contract: compiledMarketFactorySierra,
            casm: compiledMarketFactoryCasm ,
            constructorCalldata: marketFactoryConstructor,
        })
        console.log("MarketFactory Deployed: " + deployMarketFactoryResponse.deploy.contract_address)
        marketFactoryAddress = deployMarketFactoryResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let readerAddress = process.env.READER

    if (!readerAddress) {
        const compiledReaderCasm = json.parse(fs.readFileSync( "./target/dev/satoru_Reader.compiled_contract_class.json").toString( "ascii"))
        const compiledReaderSierra = json.parse(fs.readFileSync( "./target/dev/satoru_Reader.contract_class.json").toString( "ascii"))
        const readerCallData: CallData = new CallData(compiledReaderSierra.abi)
        const readerConstructor: Calldata = readerCallData.compile("constructor", {})
        const deployReaderResponse = await account0.declareAndDeploy({
            contract: compiledReaderSierra,
            casm: compiledReaderCasm ,
            constructorCalldata: readerConstructor,
        })
        console.log("Reader Deployed: " + deployReaderResponse.deploy.contract_address)
        readerAddress = deployReaderResponse.deploy.contract_address
    }

    // -------------------------------------------------------------------------

    let routerAddress = process.env.ROUTER

    if (!routerAddress) {
        const compiledRouterCasm = json.parse(fs.readFileSync( "./target/dev/satoru_Router.compiled_contract_class.json").toString( "ascii"))
        const compiledRouterSierra = json.parse(fs.readFileSync( "./target/dev/satoru_Router.contract_class.json").toString( "ascii"))
        const routerCallData: CallData = new CallData(compiledRouterSierra.abi)
        const routerConstructor: Calldata = routerCallData.compile("constructor", {
            role_store_address: roleStoreAddress,
        })
        const deployRouterResponse = await account0.declareAndDeploy({
            contract: compiledRouterSierra,
            casm: compiledRouterCasm ,
            constructorCalldata: routerConstructor,
        })
        console.log("Router Deployed: " + deployRouterResponse.deploy.contract_address)
        routerAddress = deployRouterResponse.deploy.contract_address
    }
    // -------------------------------------------------------------------------

    let exchangeRouterAddress = process.env.EXCHANGE_ROUTER

    if (!exchangeRouterAddress) {
        const compiledExchangeRouterCasm = json.parse(fs.readFileSync( "./target/dev/satoru_ExchangeRouter.compiled_contract_class.json").toString( "ascii"))
        const compiledExchangeRouterSierra = json.parse(fs.readFileSync( "./target/dev/satoru_ExchangeRouter.contract_class.json").toString( "ascii"))
        const exchangeRouterCallData: CallData = new CallData(compiledExchangeRouterSierra.abi)
        const exchangeRouterConstructor: Calldata = exchangeRouterCallData.compile("constructor", {
            router_address: routerAddress,
            data_store_address: dataStoreAddress,
            role_store_address: roleStoreAddress,
            event_emitter_address: eventEmitterAddress,
            deposit_handler_address: depositHandlerAddress,
            withdrawal_handler_address: withdrawalHandlerAddress,
            order_handler_address: orderHandlerAddress
        })
        const deployExchangeRouterResponse = await account0.declareAndDeploy({
            contract: compiledExchangeRouterSierra,
            casm: compiledExchangeRouterCasm ,
            constructorCalldata: exchangeRouterConstructor,
        })
        console.log("ExchangeRouter Deployed: " + deployExchangeRouterResponse.deploy.contract_address)
        exchangeRouterAddress = deployExchangeRouterResponse.deploy.contract_address
    }
    // -------------------------------------------------------------------------

    const roleCall2 = roleStoreContract.populate("grant_role", [account0.address, shortString.encodeShortString("MARKET_KEEPER")])
    const roleCall3 = roleStoreContract.populate("grant_role", [account0.address, shortString.encodeShortString("ORDER_KEEPER")])
    const roleCall4 = roleStoreContract.populate("grant_role",
        [
            orderHandlerAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall5 = roleStoreContract.populate("grant_role",
        [
            increaseOrderUtilsAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall6 = roleStoreContract.populate("grant_role",
        [
            decreaseOrderUtilsAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall7 = roleStoreContract.populate("grant_role",
        [
            swapOrderUtilsAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall8 = roleStoreContract.populate("grant_role",
        [
            depositHandlerAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall9 = roleStoreContract.populate("grant_role",
        [
            withdrawalHandlerAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall10 = roleStoreContract.populate("grant_role",
        [
            swapHandlerAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const roleCall11 = roleStoreContract.populate("grant_role",
        [
            exchangeRouterAddress,
            shortString.encodeShortString("CONTROLLER")
        ]
    )
    const grant_role_tx2 = await roleStoreContract.grant_role(roleCall2.calldata)
    await provider.waitForTransaction(grant_role_tx2.transaction_hash)
    const grant_role_tx3 = await roleStoreContract.grant_role(roleCall3.calldata)
    await provider.waitForTransaction(grant_role_tx3.transaction_hash)
    const grant_role_tx4 = await roleStoreContract.grant_role(roleCall4.calldata)
    await provider.waitForTransaction(grant_role_tx4.transaction_hash)
    const grant_role_tx5 = await roleStoreContract.grant_role(roleCall5.calldata)
    await provider.waitForTransaction(grant_role_tx5.transaction_hash)
    const grant_role_tx6 = await roleStoreContract.grant_role(roleCall6.calldata)
    await provider.waitForTransaction(grant_role_tx6.transaction_hash)
    const grant_role_tx7 = await roleStoreContract.grant_role(roleCall7.calldata)
    await provider.waitForTransaction(grant_role_tx7.transaction_hash)
    const grant_role_tx8 = await roleStoreContract.grant_role(roleCall8.calldata)
    await provider.waitForTransaction(grant_role_tx8.transaction_hash)
    const grant_role_tx9 = await roleStoreContract.grant_role(roleCall9.calldata)
    await provider.waitForTransaction(grant_role_tx9.transaction_hash)
    const grant_role_tx10 = await roleStoreContract.grant_role(roleCall10.calldata)
    await provider.waitForTransaction(grant_role_tx10.transaction_hash)
    const grant_role_tx11 = await roleStoreContract.grant_role(roleCall11.calldata)
    await provider.waitForTransaction(grant_role_tx11.transaction_hash)

    console.log("Roles granted.")
}

deploy()
