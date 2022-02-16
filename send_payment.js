// require("trim")
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

async function sendPayment() {
  const senderKeypair = StellarSdk.Keypair.random();
  const destination =
    "GAIH3ULLFQ4DGSECF2AR555KZ4KNDGEKN4AFI4SU2M7B43MGK3QJZNSR";
  const amount = "100";

  console.log(
    `Making a new test account and sending ${amount} lumens to ${trim(
      destination,
    )}`,
  );

  try {
    // Create a new random account
    await fetch(
      `https://friendbot.stellar.org?addr=${senderKeypair.publicKey()}`,
    );
  } catch (e) {
    console.error("Failed to fund demo account! Please try again later.");
    return;
  }
  const [
    {
      max_fee: { mode: fee },
    },
    sender,
  ] = await Promise.all([
    server.feeStats(),
    server.loadAccount(senderKeypair.publicKey()),
  ]);

  const transaction = new StellarSdk.TransactionBuilder(sender, {
    fee,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      // This operation sends the destination account XLM
      StellarSdk.Operation.payment({
        destination,
        asset: StellarSdk.Asset.native(),
        amount,
      }),
    )
    .setTimeout(30)
    .build();
  transaction.sign(senderKeypair);

  try {
    // Submit the transaction to the Stellar network.
    const transactionResult = await server.submitTransaction(transaction);
    console.log(transactionResult);

    recoupLumens(senderKeypair.secret());
    console.log(`Success! ${trim(senderKeypair.publicKey())} paid ${trim(
      destination,
    )} ${amount} XLM`);
    return `Success! ${trim(senderKeypair.publicKey())} paid ${trim(
      destination,
    )} ${amount} XLM`;
  } catch (e) {
    console.error("Oh no! Something went wrong.");
    console.error(e.response.data.detail);
    console.error(e.response.data.extras.result_codes);
    console.error(e.response.data.type);
    return e.response.data;
  }
}

sendPayment();
