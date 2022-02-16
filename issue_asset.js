const recoupLumens = async (secret) => {
  const StellarSdk = require("stellar-sdk");
  const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

  const keypair = StellarSdk.Keypair.fromSecret(secret);
  const [fee, account] = await Promise.all([
    server.fetchBaseFee(),
    server.loadAccount(keypair.publicKey()),
  ]);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee,
    networkPassphrase: StellarSdk.Networks.TESTNET
  }).addOperation(
      StellarSdk.Operation.accountMerge({
        destination: "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR",
      }),
    )
    .setTimeout(100)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx).catch(() => {});
};

const trim = address => `${address.slice(0, 10)}…`;
const StellarSdk = require("stellar-sdk");
const fetch = require("node-fetch");

const server = new StellarSdk.Server("https://horizon-testnet.stellar.org");

// Keys for accounts to issue and receive the new asset.
const issuingKeypair = StellarSdk.Keypair.random();
const distributionKeypair = StellarSdk.Keypair.fromSecret(
  "SC47H3PZHKTJQA7OYML3RJKDWATKEC6JSPQZFFYPHEWKNRVUGQJPENML",
);
const availableCurrency = "1000";
const distributedCurrency = "100";

// Create an Asset object that represents the asset to be created.
const astroDollar = new StellarSdk.Asset(
  "AstroDollar",
  issuingKeypair.publicKey(),
);

async function issueAsset() {
  try {
    console.log(
      `Creating issuing account (${trim(issuingKeypair.publicKey())})`,
    );
    await fetch(
      `https://friendbot.stellar.org?addr=${issuingKeypair.publicKey()}`,
    );
  } catch (e) {
    console.error("Failed to fund demo account! Please try again later.");
    return;
  }
  try {
    // Fetch the base fee and the account that will create our transaction
    const [
      {
        max_fee: { mode: fee },
      },
      distributionAccount,
    ] = await Promise.all([
      server.feeStats(),
      server.loadAccount(distributionKeypair.publicKey()),
    ]);

    const changeTrustTx = new StellarSdk.TransactionBuilder(
      distributionAccount,
      {
        fee,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      },
    )
      .addOperation(
        // The `changeTrust` operation creates (or alters) a trustline.
        StellarSdk.Operation.changeTrust({
          asset: astroDollar,
          limit: availableCurrency,
        }),
      )
      .addOperation(
        // One transaction can have operations from different accounts,
        // they just need to be signed by each account.
        StellarSdk.Operation.payment({
          destination: distributionKeypair.publicKey(),
          asset: astroDollar,
          amount: "1000",
          source: issuingKeypair.publicKey(),
        }),
      )
      .setTimeout(100)
      .build();
    changeTrustTx.sign(distributionKeypair);
    changeTrustTx.sign(issuingKeypair);

    console.log(
      `Making trustline and issuing ${distributedCurrency} AstroDollars…`,
    );
    const txResult = await server.submitTransaction(changeTrustTx);

    recoupLumens(issuingKeypair.secret());
    console.log(
      `Success! ${trim(
        issuingKeypair.publicKey(),
      )} issued ${distributedCurrency} AstroDollars to ${trim(
        distributionKeypair.publicKey(),
      )}`,
    );
    console.log(txResult);
  } catch (e) {
    console.error("Oh no! Something went wrong.");
    console.error(e.response.data.detail);
    console.error(e.response.data.extras.result_codes);
    console.error(e.response.data.type);
    recoupLumens(issuingKeypair.secret());
    return e.response.data;
  }
}

issueAsset();
