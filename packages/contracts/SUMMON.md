This should help expedite local setup.  

1) start a local chain (hh node or anvil)
2) start docker

Run all of these from within `contracts/`
 
 1) `yarn start-graph-node` (starts up the graph node in docker)
 2) create a new terminal and `yarn summon`.  This will deploy and link all the contracts. Hit `y` when prompted. This should also write all the deployed contract addresses to the config as well as the graph/config for the subgraph.
 3) `yarn deploy-subgraph` This will do everything to set up and deploy the subgraph.