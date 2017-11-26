import {Simulation} from "./simulation.js";

let rules = {
  // The number of actors (bots)
  actorCount: 2,
  // The details for those actors
  actorDetails: [
    {
      identifier: 'boss',
      priority: 0,
    },
    {
      identifier: 'newkid',
      priority: 1,
    },
  ],
  // The area in which the simulation will take place - / = Solid, _ = Ground, Actor spawn, Material spawn, Objective
  simulationArea: [
    ['/','/','/','/','/','/','/','/'],
    ['/','A','_','_','_','_','_','/'],
    ['/','A','_','_','O','O','_','/'],
    ['/','_','_','_','O','O','_','/'],
    ['/','B','_','_','_','_','_','/'],
    ['/','/','/','/','/','/','/','/']
  ],
  // The elements Actors are allowed to move onto
  groundElements: ['_'],
  // The elements Actors can pick up
  itemElements: ['B'],
  // The elements Actors try to build
  objectiveElements: ['O'],
};

let simulation = new Simulation(rules);