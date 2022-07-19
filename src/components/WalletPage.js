import React from "react";
import { Button } from "antd";
import { web3Instance } from "../web3";
import { web3Modal } from "../web3Modal";
import { walletTypes } from "../constants";
import "./style/style.css";
const WalletPage = ({ onLogin, setWalletModal }) => {
  const wallets = web3Modal.userOptions;

  const alertInstall = () => {
    alert("Metamask extension required");
  };

  const getProvider = async (walletType) => {
    let provider;

    switch (walletType) {
      case walletTypes.META_MASK:
        // check for installed extension
        if (window.ethereum) {
          // check if there are multiple extensions
          if (window.ethereum.providers) {
            // search metamask provider
            let noMetaMask = true;
            window.ethereum.providers.forEach((item) => {
              if (item.isMetaMask) {
                provider = item;
                noMetaMask = false;
              }
            });
            if (noMetaMask) alertInstall();
          } else {
            // There is only one extension
            // check if it is a metamask
            if (window.ethereum.isMetaMask) {
              provider = window.ethereum;
            } else {
              alertInstall();
            }
          }
        } else {
          alertInstall();
        }
        break;
      default:
        provider = await web3Modal.connectTo(walletType);
    }

    return provider;
  };

  const setProvider = async (walletType) => {
    const newProvider = await getProvider(walletType);
    if (!newProvider) {
      console.log("Can't set a new Provider!");
      return;
    }

    newProvider.on("accountsChanged", function (accounts) {
      alert("A change", accounts);
    });
    newProvider.on("chainChanged", function (chainId) {
      alert("chain change", chainId);
    });
    newProvider.on("disconnect", function (code, reason) {
      alert("disconnect", code, reason);
    });

    web3Instance.web3.setProvider(newProvider);
    await onLogin(walletType);
    console.log("Set a new Provider!", newProvider);
  };

  const ConnectButton = ({ wallet, index, size = "30px" }) => {
    if (
      index === 0 &&
      wallet.name !== "MetaMask" &&
      wallet.name !== "WalletConnect"
    ) {
      return <></>;
    }

    return (
      // <Button size={"large"} onClick={() => setProvider(wallet.id)}>
      //   <img
      //     src={wallet.logo}
      //     alt="wallet img"
      //     style={{ width: size, height: size, marginRight: "10px" }}
      //   />
      //   <p>{wallet.name}</p>
      // </Button>
      <div className="wallet-list" onClick={() => setProvider(wallet.id)}>
        <img
          src={wallet.logo}
          alt="wallet img"
          style={{ width: size, height: size, marginRight: "10px" }}
        />
        <p>{wallet.name}</p>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {wallets.map((wallet, index) => (
        <ConnectButton key={index} wallet={wallet} index={index} />
      ))}
      <div style={{ marginTop: "48px", marginBottom: "40px", width: "100%" }}>
        <h3>Connectable with WEMIX Wallet App</h3>
        <p>1. Select WalletConnect</p>
        <p>2. Use the QR scan fuction of the WEMIX Wallet App main.</p>
      </div>
      <Button
        className="walletlist-cancel-btn"
        onClick={() => setWalletModal()}
      >
        Cancel
      </Button>
    </div>
  );
};

export default WalletPage;
