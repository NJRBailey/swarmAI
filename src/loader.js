import {Simulation} from "./simulation.js";

let rules = {
  // The number of actors (bots)
  actorCount: 2,
  // The details for those actors
  actorDetails: [
    {
      identifier: 'boss',
      priority: 1,
    },
    {
      identifier: 'newkid',
      priority: 0,
    }
  ],
  // The elements Actors are allowed to move onto
  groundElements: ['_'],
  // The elements Actors can pick up
  itemElements: ['B'],
  // The elements Actors try to build
  objectiveElements: ['O'],
  // The area in which the simulation will take place - / = Solid, _ = Ground, Actor spawn, Material spawn, Objective
  simulationArea: [
    ['/','/','/','/','/','/','/','/'],
    ['/','A','_','_','_','_','_','/'],
    ['/','A','_','_','O','O','_','/'],
    ['/','_','_','_','O','O','_','/'],
    ['/','B','_','_','_','_','_','/'],
    ['/','/','/','/','/','/','/','/']
  ],
  pathfindingHeuristic: function(currentPos, targetPos) {
    let cost = 0;
    cost = (
      Math.abs(currentPos[0] - targetPos[0]) + Math.abs(currentPos[1] - targetPos[1])
    );
    return cost;
  }
};

let simulation = new Simulation(rules);