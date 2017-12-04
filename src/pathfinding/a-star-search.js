import TinyQueue from 'tinyqueue';
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
   * @return {Array}         The list of positions to get to the target
   */
  calculateShortestPath(current, target) {
    return this.calculateNextStep([current], target);
  }

  /**
   * A recursive function which calculates each step of the path between the current
   * path position and the target position.
   *
   * @param {Array} path The path that has been calculated so far
   * @param {Array} target The target position
   * @param {Array} checkedTiles The tiles checked already // toto maybe useful?
   */
  calculateNextStep(path, target) {
    let currentNode = path[path.length - 1];
    let orderedQueue = new TinyQueue([], function(a, b){
      return a.cost - b.cost;
    });

    let tiles = this.getValidEdges(currentNode.position);
    // If we are next to the target, we have finished searching
    if (tiles.includes(target)) {
      return path.push(target);
    }

    for (let tile of tiles) {
      // Populate array of tiles from lowest-cost to highest cost
      let cost = 1 + tile.cost + this.heuristic(currentNode.position, target);
      orderedQueue.push({
        position: tile,
        cost: cost
      });
    }
    // Convert the non-iterable priority queue into an array
    let orderedTiles = [];
    while (TinyQueue.length > 0) orderedTiles.push(orderedQueue.pop());

    // Iterate through each step
    for (let tile of orderedTiles) {
      if (!path.includes(tile.position)) {
        let continuedRoute = calculateNextStep(path.push(tile.position), target);
        if (continuedRoute !== null) {
          return continuedRoute;
        }
      }
    }
    return null;
  }

  /**
   * Returns the positions of the ground tiles around the specified tile
   * @param {Array} position The position
   * @return {Array} The ground tiles
   */
  getValidEdges(position) {
    // let edges = this.actor.getSurroundings();
    let edges = {
      elements: [
        this.simulation.area[(position[0] - 1, position[1])], // North
        this.simulation.area[(position[0], position[1] + 1)], // East
        this.simulation.area[(position[0] + 1, position[1])], // South
        this.simulation.area[(position[0], position[1] - 1)] // West
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
      if (this.actor.config.ground.includes(edges.elements[index])) {
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
    return validEdges;
  }
}
