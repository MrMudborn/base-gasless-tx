/**
 * Base paymaster integration Guide
 * ------------------------------
 * This component demonstrates NFT minting with different wallet types and gas sponsorship options.
 *
 * Key Features:
 * 1. Supports both Coinbase Wallet (with paymaster) and other wallets
 * 2. Implements gas sponsorship via paymaster on Base network
 * 3. Handles different transaction types (AA and regular transactions)
 *
 * Transaction Functions:
 * ---------------------
 * 1. writeContracts (for Coinbase Wallet):
 *    - Supports gas sponsorship via paymaster
 *    - Returns AA-type transaction hash
 *    - Used when connector type is 'coinbaseWallet'
 *
 * 2. writeContract (for other wallets):
 *    - Standard transaction without gas sponsorship
 *    - Returns regular transaction hash (Bundle transaction hash)
 *    - Used for all other wallet types
 *
 * Gas Sponsorship:
 * ---------------
 * - Only available on Base network with Coinbase Smart Wallet
 * - Requires valid paymaster capabilities
 * - When sponsored, user doesn't pay gas fees
 *
 * Transaction Hash Types:
 * ---------------------
 * 1. AA Transaction Hash (from writeContracts):
 *    - First 66 characters represent the actual transaction
 *    - Cannot be used with useWaitForTransactionReceipt
 *
 * 2. Bundle Transaction Hash (from writeContract):
 *    - Standard transaction hash
 *    - Can be used with useWaitForTransactionReceipt
 *
 * Example Transaction Hashes:
 * -------------------------
 * 1. Sponsored AA Transaction (Base + writeContracts):
 *    0x25a9852ef9f1f1f05acc8192c8b1cd2b91d2591774f8fdc8834e324f6c585253
 *
 * 2. Non-Sponsored AA Transaction (Base + writeContracts):
 *    0xd05526148d43f2f624fb95f84fa5ea492f8638e3ed7f520cef8535706bb5cc2f
 *
 * 3. Standard Transaction (Base + writeContract):
 *    0x1791f5e3564960fc8889242d757b65b519cd8b4617e23a22efa537670b3ef00d
 *
 * @see https://wagmi.sh/react/api/hooks/useWriteContracts
 * @see https://wagmi.sh/react/api/hooks/useWriteContract
 */

/**
 * Success tx hashes
 * check on https://basescan.org/
 *
 * Base. Sponsored. writeContracts func
 * hash =  "0x25a9852ef9f1f1f05acc8192c8b1cd2b91d2591774f8fdc8834e324f6c585253"
 *
 * Base. Not sponsored. writeContracts func
 * hash = "0xd05526148d43f2f624fb95f84fa5ea492f8638e3ed7f520cef8535706bb5cc2f"
 *
 * Base, No sponsored, writeContract func
 * hash = "0x1791f5e3564960fc8889242d757b65b519cd8b4617e23a22efa537670b3ef00d"
 */

"use client";

import { zoraNftCreatorV1Config } from "@zoralabs/zora-721-contracts";
import { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useConnections,
  useDisconnect,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useCapabilities, useWriteContracts } from "wagmi/experimental";

function App() {
  const account = useAccount();
  const address = account.address;
  const { connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const connections = useConnections();
  const [isMinting, setIsMinting] = useState(false);

  const connetorType = connections[0]?.connector?.type;
  console.log("connetor type", connections[0]?.connector?.type);

  const {
    writeContract,
    data: writeData, // its bundle tx hash (can get the data with useWaitForTransactionReceipt)
    error: writeError,
    isSuccess: isWriteSuccess,
  } = useWriteContract();

  const {
    writeContracts,
    data: writesData, // its AA tx hash (can't get the data with useWaitForTransactionReceipt(), get the Bundle tx hash)
    error: writesError,
    isSuccess: isWritesSuccess,
  } = useWriteContracts({
    mutation: { onSuccess: (data) => console.log("Mint successful", data) },
  });

  // Extract just the transaction hash (first 66 characters)
  const txHash = isWritesSuccess
    ? (writesData?.slice(0, 66) as `0x${string}`)
    : writeData;

  // TODO: get the Bundle tx hash for AA type, to get the tx details by useWaitForTransactionReceipt()

  console.log({ writeData, txHash });

  const {
    data: receipt,
    isLoading: isPending,
    isSuccess,
    error: hashError,
    isLoadingError,
    status: hashStatus,
  } = useWaitForTransactionReceipt({
    hash: txHash, // supports bundle tx hash not AA tx hash.
  });

  console.log({ writeError, writesError });
  console.log({ isPending, isSuccess, hashError, hashStatus, receipt });

  const args = [
    "test",
    "TEST",
    "0xfffffffffff",
    "500",
    "0x62b14E5D09BC0C340116B5BC87d787377C07A820",
    "0x62b14E5D09BC0C340116B5BC87d787377C07A820",
    {
      publicSalePrice: "0",
      maxSalePurchasePerAddress: "4294967295",
      publicSaleStart: "0",
      publicSaleEnd: "18446744073709551615",
      presaleStart: "0",
      presaleEnd: "0",
      presaleMerkleRoot:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
    },
    "This is my Poster Collection",
    "0x0",
    "0x0",
    "0x62b14E5D09BC0C340116B5BC87d787377C07A820",
  ];

  // Check for paymaster capabilities with `useCapabilities`
  const { data: availableCapabilities } = useCapabilities({
    account: address,
  });

  const capabilities = useMemo(() => {
    if (!availableCapabilities || !address) return {};
    const capabilitiesForChain = availableCapabilities[chainId];
    if (
      capabilitiesForChain["paymasterService"] &&
      capabilitiesForChain["paymasterService"].supported
    ) {
      return {
        paymasterService: {
          url: `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_BASE_PAYMASTER_API_KEY}`, //For production use proxy
        },
      };
    }
    return {};
  }, [availableCapabilities, address]);

  console.log(chainId);
  console.log({ capabilities });

  const handleMint = async () => {
    setIsMinting(true);
    try {
      if (connetorType === "coinbaseWallet") {
        console.log("connetorType === coinbaseWallet");
        writeContracts({
          contracts: [
            {
              abi: zoraNftCreatorV1Config.abi,
              address: "0x58C3ccB2dcb9384E5AB9111CD1a5DEA916B0f33c",
              functionName: "createEditionWithReferral",
              args: args,
            },
          ],
          capabilities,
        });
      } else {
        console.log("connetorType === injected");
        writeContract({
          abi: zoraNftCreatorV1Config.abi,
          address: "0x58C3ccB2dcb9384E5AB9111CD1a5DEA916B0f33c",
          functionName: "createEditionWithReferral",
          args: args as any,
        });
      }
    } catch (error) {
      console.error("Minting failed:", error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <>
      <div>
        <h2>Account</h2>

        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.address)}
          <br />
          chainId: {account.chainId}
        </div>

        {account.status === "connected" && (
          <button type="button" onClick={() => disconnect()}>
            Disconnect
          </button>
        )}
      </div>

      <div>
        <h2>Connect</h2>
        {account?.isConnected ? (
          <button onClick={handleMint}>
            {isMinting ? "Minting..." : "Mint NFT"}
          </button>
        ) : (
          connectors?.map((connector, index) => (
            <button type="button" onClick={() => connector.connect()}>
              {connector?.name}
            </button>
          ))
        )}
        <div>{status}</div>
        <div>{error?.message}</div>
      </div>
    </>
  );
}

export default App;
