/**
 * A basic Actor for the Simulation.
 * @version 2017-11-22
 * @author NJRBailey
 * 
 * Actors want to pick up blocks, place the block, and repeat until done, without:
 *  - Colliding with another Actor or block
 *  - Making the same section as another Actor
 *  - Barring off a section from being made (e.g. by surrounding an empty objective point with blocks) 
 * 
 * One way would be to have the bots constantly trading locations
 * I think a better way would be to use a path-finding algorithm (e.g. A*) to determine a path for each Actor to the next objective,
 * which is shared out to the other Actors, and update it if three conditions are met:
 *  1) The paths cross the same point for multiple Actors
 *  2) The paths will cross after the same number of moves (tiles traversed)
 *  3) The priority for this Actor is less than for the other Actor
 * This point will then need to be temporarily blacklisted for that actor, until the next objective is completed
 * For this version of the Actor there are no chokepoints, so the Actors can be constantly moving.
 */
class Actor {
  /**
   * Create a new basic Actor
   * @param {String}     identifier The unique identifier for this Actor 
   * @param {Integer}    priority   The priority to use in path disputes - lower value means higher importance
   * @param {Simulation} simulation The Simulation to broadcast position, route, objective point to 
   */
  constructor(identifier, priority, simulation) {
    this.identifier = identifier;
    this.priority = priority;
    this.simulation = simulation;
    // Whether the Actor should be performing tasks
    this.active = true;
    // Whether the Actor is carrying an item
    this._item = undefined;
    // While active, do things
  }


}