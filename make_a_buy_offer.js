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

const accountKeypair = StellarSdk.Keypair.random();

const astroDollar = new StellarSdk.Asset(
  "AstroDollar",
  "GDA2EHKPDEWZTAL6B66FO77HMOZL3RHZTIJO7KJJK5RQYSDUXEYMPJYY",
);

async function makeBuyOffer() {
  try {
    await fetch(
      `https://friendbot.stellar.org?addr=${accountKeypair.publicKey()}`,
    );

    // Fetch the base fee and the account that will create our transaction
    const [
      {
        max_fee: { mode: fee },
      },
      account,
    ] = await Promise.all([
      server.feeStats(),
      server.loadAccount(accountKeypair.publicKey()),
    ]);

    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        // Our account needs to explicitly trust the asset before we can
        // make an offer
        StellarSdk.Operation.changeTrust({
          asset: astroDollar,
          limit: "1000",
        }),
      )
      // The `manageBuyOffer` operation creates (or alters) a buy offer.
      .addOperation(
        StellarSdk.Operation.manageBuyOffer({
          selling: StellarSdk.Asset.native(),
          buying: astroDollar,
          buyAmount: "1000",
          price: ".1",
        }),
      )
      .setTimeout(100)
      .build();
    transaction.sign(accountKeypair);

    const txResult = await server.submitTransaction(transaction);

    recoupLumens(accountKeypair.secret());
    console.log(txResult);
    console.log(`Success! ${trim(
      accountKeypair.publicKey(),
    )} offered to buy 1000 XLM for 0.1 AstroDollars each`);
    return `Success! ${trim(
      accountKeypair.publicKey(),
    )} offered to buy 1000 XLM for 0.1 AstroDollars each`;
  } catch (e) {
    console.error("Oh no! Something went wrong.");
    console.error(e.response.data.detail);
    console.error(e.response.data.extras.result_codes);
    console.error(e.response.data.type);
    return e.response.data;
  }
}

makeBuyOffer();
