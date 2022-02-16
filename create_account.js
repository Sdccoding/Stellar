
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

// Create a new keypair.
const pair = StellarSdk.Keypair.random();

async function createTestAccount() {
  try {
    console.log(
      "Funding a new account on the test network (takes a few seconds)…"
    );
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${pair.publicKey()}`
    );
    const data = await response.json();

    console.log(`Public Key: ${pair.publicKey()}`);
    console.log(`Secret Key: ${pair.secret()}`);
    return "Success! You have a funded Testnet account :)";
  } catch (e) {
    console.error("Oh no! Something went wrong:", e);
  }
}

createTestAccount();
