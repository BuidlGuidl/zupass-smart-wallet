"use client";

import { useCallback, useState } from "react";
import { useAccount, useSignerStatus } from "@alchemy/aa-alchemy/react";
import { zuAuthPopup } from "@pcd/zuauth";
import type { NextPage } from "next";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
// import useUserops from "~~/hooks/useUserops";
import { notification } from "~~/utils/scaffold-eth";
import { generateWitness } from "~~/utils/scaffold-eth/pcd";
import { ETHBERLIN_ZUAUTH_CONFIG } from "~~/utils/zupassConstants";

// Get a valid event id from { supportedEvents } from "zuauth" or https://api.zupass.org/issue/known-ticket-types
const fieldsToReveal = {
  revealAttendeeEmail: true,
  revealEventId: true,
  revealProductId: true,
};

const Home: NextPage = () => {
  const [verifiedOnChain, setVerifiedOnChain] = useState(false);
  const { account } = useAccount({ type: "MultiOwnerModularAccount" });
  const connectedAddress = account?.address;
  const { isConnected } = useSignerStatus();

  const [pcd, setPcd] = useState<string>();

  const getProof = useCallback(async () => {
    if (!connectedAddress) {
      notification.error("Please connect wallet");
      return;
    }
    const result = await zuAuthPopup({ fieldsToReveal, watermark: connectedAddress, config: ETHBERLIN_ZUAUTH_CONFIG });
    if (result.type === "pcd") {
      setPcd(JSON.parse(result.pcdStr).pcd);
    } else {
      notification.error("Failed to parse PCD");
    }
  }, [connectedAddress]);

  // mintItem verifies the proof on-chain and mints an NFT
  const { writeContractAsync: mintNft, isMining: isMintingNFT } = useScaffoldWriteContract("YourCollectible");

  // const { sendOps } = useUserops({
  //   contractName: "YourCollectible",
  //   functionName: "mintItem",
  //   // @ts-ignore TODO: fix the type later with readonly fixed length bigInt arrays
  //   args: [pcd ? generateWitness(JSON.parse(pcd)) : undefined],
  // });

  const { data: yourBalance } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  return (
    <>
      <div className="flex flex-col items-center mt-24">
        <div className="card max-w-[90%] sm:max-w-lg bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Zupass: Smart Wallet</h2>
            <p className="mt-0">
              - Get started by loging in and verifying your email. A smart account will be generated for you
            </p>
            <p className="mt-0">
              - Next up is using{" "}
              <a className="link" href="https://github.com/proofcarryingdata/zupass" target="_blank">
                Zupass
              </a>{" "}
              to verify PCDs (Proof-Carrying Data). <span className="font-bold">e.g.</span> ETHBerlin tickets.
            </p>
            <p className="mt-0">- Finally mint an NFT with the Zupass proof. You would not have to pay any gas fee</p>
            <div className="flex flex-col gap-4 mt-6">
              <div className="tooltip" data-tip="Loads the Zupass UI in a modal, where you can prove your PCD.">
                <button
                  className="btn btn-secondary w-full tooltip"
                  onClick={getProof}
                  disabled={!!pcd || !isConnected}
                >
                  {!pcd ? "1. Get Proof" : "1. Proof Received!"}
                </button>
              </div>
              <div className="tooltip" data-tip="Submit the proof to a smart contract to verify it on-chain.">
                <button
                  className="btn btn-primary w-full"
                  disabled={!pcd || verifiedOnChain}
                  onClick={async () => {
                    try {
                      await mintNft({
                        functionName: "mintItem",
                        // @ts-ignore TODO: fix the type later with readonly fixed length bigInt arrays
                        args: [pcd ? generateWitness(JSON.parse(pcd)) : undefined],
                      });
                    } catch (e) {
                      notification.error(`Error: ${e}`);
                      return;
                    }
                    setVerifiedOnChain(true);
                  }}
                >
                  {isMintingNFT ? <span className="loading loading-spinner"></span> : "4. Verify (on-chain) and mint"}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  className="btn btn-ghost text-error underline normal-case"
                  onClick={() => {
                    setVerifiedOnChain(false);
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="text-center text-lg">
                {yourBalance && yourBalance >= 1n ? `NFT Balance: ${Number(yourBalance)}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
