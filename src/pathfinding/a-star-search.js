import TinyQueue from "tinyqueue";
import {arrayHolds} from '../actor';
// let TinyQueue = require('tinyqueue');
/**
 * A* needs checks each possible next move (i.e. N,E,S,W) and selects the one which
 * the heuristic says is closest.
 * Each non-start node is set to infinity. Then for each node we land on, we make its neighbours
 * cost equal the cost of the path + the cost of the current node + estimatedCostToTarget
 * (costOfEdge + costOfCurrentNode + estimatedCostToTarget)
 * The estimate is calculated by the heuristic.
 *
 * Nodes are ground elements
 * (more complex - actors which are not going to be in that position when this actor reaches it)
 * The target tile is the currently required objective (closest bricks/building site)
 * Note - closest might result in a blockage. Would need to be check for if a building site
 * was surrounded on 3 sides.
 * The heuristic could be straight-line distance (underestimate), or
 * it could be tile distance (abs(t[0]-c[0]))
 * The edge cost will always be 1.
 *
 * Checks are operated within this class. The Simulation and Actors do not deal with the
 * pathfinding logic.
 *
 * Analysis - some time is wasted in one of the for loops in _calculateNextStep()
 *          - using the current node as the first step in the path is wasteful
 *            It would be more efficient to have a for loop for the valid first
 *            steps - this would be code duplication from the _calculateNextSteps()
 *            in the calculateShortestPath method however.
 *
 *
 */
export class AStarSearch {
  /**
   * Constructs the search module for use by an Actor.
   * @param {Simulation} simulation The current simulation.
   * @param {Actor}      actor      The Actor we are pathfinding for.
   * @param {Function}   heuristic  The heuristic function to use. Must return a number.
   */
  constructor(simulation, actor, heuristic) {
    this.simulation = simulation;
    this.actor = actor;
    this.heuristic = heuristic;
    // The position of the next objective
    // let objective = this.actor.objective;
    // while (objective !== undefined) {}
  }

  /**
   * Calculates the shortest path between the current position and the target position.
   * Only moves on ground tiles. Recurses until a path has been found
   * or all nodes have been checked.
   * @param  {Array} current The current position of the Actor.
   * @param  {Array} target  The target position.
   * @param  {Array} [area]  The area to search through.
   * @return {Array}         The list of positions to get to the target
   */
  calculateShortestPath(current, target, area = undefined) {
    console.log('current: ' + current);
    console.log('target: ' + target);
    // Set the area to search
    if (area !== undefined) {
      this.area = area;
    } else {
      this.area = this.simulation.area;
    }
    let currentNode = {
      position: current,
      cost: 0
    };
    let path = this._calculateNextStep([current], target, currentNode);
    // Removes the first node from the path - will be the current node
    path.shift();
    return path;
  }

  /**
   * A recursive function which calculates each step of the path between the current
   * path position and the target position.
   *
   * @param {Array}  path   The path (list of positions) that has been calculated so far
   * @param {Array}  target The target position
   * @param {Object} node   The current position with cost
   */
  _calculateNextStep(path, target, node) {
    let currentStep = node.position;
    console.log("path: " + path);
    // Queue in order of estimated cost
    let orderedQueue = new TinyQueue([], function(a, b) {
      return a.cost - b.cost;
    });

    let tiles = this.getValidEdges(currentStep);
    // If we are next to the target, we have finished searching
    if (arrayHolds(tiles, target)) {
      console.log("Target found, returning path");
      return path;
    } else if (currentStep === target) {
      throw new Error("Trying to pathfind to the current position.");
    } else {
      // We need to search for the next step
      // Populate array of tiles from lowest cost to highest cost
      for (let tile of tiles) {
        // TODO refactor so this doesn't need to check the area
        if (this.actor.config.ground.includes(this.area[tile[0]][tile[1]])) {
          let tileCost = node.cost + 1;
          // TODO check the tutorials again and see if you should actually do 1 + tileCost
          let cost = 1 + tileCost + this.heuristic(tile, target);

          orderedQueue.push({
            position: tile,
            cost: cost
          });
        }
      }
      // Convert the non-iterable priority queue into an array
      let orderedTiles = [];
      while (orderedQueue.length > 0) {
        orderedTiles.push(orderedQueue.pop());
      }

      // Iterate through each step
      for (let tile of orderedTiles) {
        if (!arrayHolds(path, tile.position)) {
          console.log("recursing deeper");
          // Add this tile as the next step in the path
          path.push(tile.position);
          let continuedRoute = this._calculateNextStep(path, target, tile);
          if (continuedRoute !== null) {
            console.log("returned route was not null, returning path");
            return continuedRoute;
          }
          path.pop();
        }
      }
      console.log("all possible routes from the current tile returned null");
      return null;
    }
  }

  /**
   * Returns the positions of the ground and goal tiles around the specified tile
   * @param {Array} position The position
   * @return {Array} The ground tiles
   */
  getValidEdges(position) {
    // let edges = this.actor.getSurroundings();
    let edges = {
      elements: [
        this.area[position[0] - 1][position[1]], // North
        this.area[position[0]][position[1] + 1], // East
        this.area[position[0] + 1][position[1]], // South
        this.area[position[0]][position[1] - 1] // West
      ],
      positions: [
        [position[0] - 1, position[1]],
        [position[0], position[1] + 1],
        [position[0] + 1, position[1]],
        [position[0], position[1] - 1]
      ]
    };
    let validEdges = [];
    for (let index = 0; index < edges.elements.length; index++) {
      console.log('objectives: ' + this.actor.config.objectives);
      console.log('element: ' + edges.elements[index]);
      if (
        this.actor.config.ground.includes(edges.elements[index]) ||
        this.actor.config.items.includes(edges.elements[index]) ||
        this.actor.config.objectives.includes(edges.elements[index])
      ) {
        validEdges.push(edges.positions[index]);
      }
    }
    if (validEdges.length === 0 && !edges.elements.includes("A")) {
      throw new Error(
        this.actor.identifier + " is surrounded by immovable objects"
      );
    } else if (validEdges.length === 0) {
      // There is an actor blocking us in
      throw new Error(
        this.actor.identifier + " is being blocked in by another Actor"
      );
    }
    console.log(JSON.stringify(validEdges));
    return validEdges;
  }
}

