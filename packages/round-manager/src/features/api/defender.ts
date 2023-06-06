export const updateDefenderSentinel = (votingContractAddress: string) => {
  const apiURL = `${process.env.REACT_APP_GRANTS_API_ENDPOINT}/update/add-defender-sentinel-address/${votingContractAddress}`;
  return fetch(apiURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((resp) => {
    if (resp.ok) {
      return true;
    } else {
      console.log("error", resp.json());
      return Promise.reject(false);
    }
  });
};
