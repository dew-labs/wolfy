import { getContracts, settingUp } from "../utils";
import { grantRole, SatoruRole } from "satoru-sdk";

async function grantRoles() {
    const { account, chainId } = await settingUp();

    const contracts = getContracts();

    const increaseOrderUtilsAddress = contracts.IncreaseOrderUtils;
    const decreaseOrderUtilsAddress = contracts.DecreaseOrderUtils;
    const swapOrderUtilsAddress = contracts.SwapOrderUtils;
    const orderUtilsAddress = contracts.OrderUtils;
    const depositHandlerAddress = contracts.DepositHandler;
    const withdrawalHandlerAddress = contracts.WithdrawalHandler;
    const orderHandlerAddress = contracts.OrderHandler;
    const swapHandlerAddress = contracts.SwapHandler;
    const exchangeRouterAddress = contracts.ExchangeRouter;
    const marketFactoryAddress = contracts.MarketFactory;

    if (
        !increaseOrderUtilsAddress ||
        !decreaseOrderUtilsAddress ||
        !swapOrderUtilsAddress ||
        !orderUtilsAddress ||
        !depositHandlerAddress ||
        !withdrawalHandlerAddress ||
        !orderHandlerAddress ||
        !swapHandlerAddress ||
        !exchangeRouterAddress ||
        !marketFactoryAddress
    ) {
        throw new Error("Missing required contract addresses.");
    }

    // -------------------------------------------------------------------------

    // Grant roles to Account0 (deployment account)
    await grantRole(
        chainId,
        account,
        account.address,
        [
            SatoruRole.ROLE_ADMIN,
            SatoruRole.CONTROLLER,
            SatoruRole.ORDER_KEEPER,
            SatoruRole.MARKET_KEEPER,
            // SatoruRole.ROUTER_PLUGIN,
        ],
        "Account0"
    );

    // -------------------------------------------------------------------------

    // Grant roles to utils
    await grantRole(
        chainId,
        account,
        increaseOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "IncreaseOrderUtils"
    );
    await grantRole(
        chainId,
        account,
        decreaseOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "DecreaseOrderUtils"
    );
    await grantRole(
        chainId,
        account,
        swapOrderUtilsAddress,
        SatoruRole.CONTROLLER,
        "SwapOrderUtils"
    );
    await grantRole(chainId, account, orderUtilsAddress, SatoruRole.CONTROLLER, "OrderUtils");

    // -------------------------------------------------------------------------

    // Grant roles to handlers
    await grantRole(
        chainId,
        account,
        depositHandlerAddress,
        SatoruRole.CONTROLLER,
        "DepositHandler"
    );
    await grantRole(
        chainId,
        account,
        withdrawalHandlerAddress,
        SatoruRole.CONTROLLER,
        "WithdrawalHandler"
    );
    await grantRole(chainId, account, swapHandlerAddress, SatoruRole.CONTROLLER, "SwapHandler");
    await grantRole(chainId, account, orderHandlerAddress, SatoruRole.CONTROLLER, "OrderHandler");

    // -------------------------------------------------------------------------

    // Grant roles to exchange router
    await grantRole(
        chainId,
        account,
        exchangeRouterAddress,
        [
            SatoruRole.CONTROLLER,
            SatoruRole.ROUTER_PLUGIN,
            // Order keeper role is sus?
            SatoruRole.ORDER_KEEPER,
        ],
        "ExchangeRouter"
    );

    // -------------------------------------------------------------------------

    // Grant roles to market factory
    await grantRole(
        chainId,
        account,
        marketFactoryAddress,
        [SatoruRole.MARKET_KEEPER, SatoruRole.CONTROLLER],
        "MarketFactory"
    );

    // -------------------------------------------------------------------------

    console.log("All roles granted");
}

grantRoles();
