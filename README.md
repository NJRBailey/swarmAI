# swarmAI
First go at cooperative AI.

##Basic
- Bots need to not collide
- Bots need to not make same section
- Bots need to not block a section from being made (e.g. a section which needs to be filled in should not be surrounded before it can be filled)

##More advanced:
- Bots need to not block each other in chokepoints (e.g. one-block wide corridors)
- Bots need to cement blocks together - cement dries out after x number of moves
- Bots need to navigate blockages in terrain without getting stuck

##Even more advanced:
- Moving obstacles
- Bots need to return to charging port when power is low, and should do so before starting a task which will take more power than it currently has
- Bots need to not block each other in chokepoints based on task importance
- Bots need to move resources closer if it's impossible to cement without it drying
- Use genetic algorithm to find best solution for shape
- One problem is the Actor recalculating its path because another Actor is blocking a space, but if that Actor moved, the path revealed would be quicker.
... - This could be solved by taking turns, but that would probably make every simulation take up to 2x as long as needed.
... - You could calculate two paths, one going around, and one going over the other Actor. Then if the path over the Actor is 2 or more moves better than the path going around, wait for one turn and do that path (unless there will be a blockage with the other Actor anyway later on)
