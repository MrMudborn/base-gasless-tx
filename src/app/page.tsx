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

  // Base. Sponsored. writeContracts func
  // hash =  "0x25a9852ef9f1f1f05acc8192c8b1cd2b91d2591774f8fdc8834e324f6c585253";

  // Base. Not sponsored. writeContracts func
  // hash = "0xd05526148d43f2f624fb95f84fa5ea492f8638e3ed7f520cef8535706bb5cc2f"

  // Base, No sponsored, writeContract func
  // hash = "0x1791f5e3564960fc8889242d757b65b519cd8b4617e23a22efa537670b3ef00d"

  /**
   * Paymaster is only supported n Base with CoinsBase smart wallet. Is only works with writeContracts funtion with capabilities valus.
   * If capabilities values correct and has valid paymaster then gas will be sponsored otherwise it will ask to pay it.
   * Currenlty writeContracts funtion is only supported by the CoinsBase smart wallet. If you are using other wallets then use writeContract funtion
   * writeContracts funtion = https://wagmi.sh/react/api/hooks/useWriteContracts
   * writeContract funtion = https://wagmi.sh/react/api/hooks/useWriteContract
   */

  console.log({ writeError, writesError });
  console.log({ isPending, isSuccess, hashError, hashStatus, receipt });

  const args = [
    "test",
    "TEST",
    "0xfffffffffff",
    "500",
    "0xFAB7A6a2C0506D07348492F9D6f20eC56A47E664",
    "0xFAB7A6a2C0506D07348492F9D6f20eC56A47E664",
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
    "0x77fAD8D0FcfD481dAf98D0D156970A281e66761b",
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
