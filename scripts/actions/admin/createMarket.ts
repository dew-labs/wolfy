import { settingUp } from "@freyr/shared/utils";
import createMarket from "./utils/createMarket";
import deployToken from "./utils/deployToken";

async function deployTokenThenCreateMarket() {
    const { account, net } = await settingUp();

    // BEGIN deploy tokens
    const longTokenContract = await deployToken(
        net,
        account,
        "Wolfy Ethereum",
        "wfETH",
        18,
        10 // 10 ETH
    );
    const shortTokenContract = await deployToken(net, account, "Dew USD", "DUSD", 18, 1000000); // 1000000 DUSD

    const indexTokenAddress = longTokenContract.address;
    const longTokenAddress = indexTokenAddress;
    const shortTokenAddress = shortTokenContract.address;

    // END deploy tokens

    createMarket(account, indexTokenAddress, longTokenAddress, shortTokenAddress);
}

deployTokenThenCreateMarket();
