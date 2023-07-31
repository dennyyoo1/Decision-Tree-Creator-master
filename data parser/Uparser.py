import random

file = open("unix.txt", "r")

commands = []
for line in file:
    if line[0] != "<":
        commands.append(line.replace("\n", ""))

class Connector:
    def __init__(self, name):
        self.name = name
        self.connections = []
        self.totalConnections = 0
    
    def __eq__(self, other):
        return self.name == other.name

    def append(self, connection):
        if connection in self.connections:
            self.connections[self.connections.index(connection)].frequency += 1
        else:
            self.connections.append(connection)
        self.totalConnections += 1


class Connection:
    def __init__(self, name):
        self.name = name
        self.frequency = 1
    
    def __eq__(self, other):
        return self.name == other.name

    def __str__(self):
        return (self.name + " [" + str(self.frequency) + "]")

eof = Connector("**EOF**")
eof.totalConnections = 1000000
connectors = [eof]

for comPtr in range(len(commands) - 1):
    command = commands[comPtr]
    if command == "**EOF**":
        continue
    follows = commands[comPtr + 1]
    connector = Connector(command)
    if Connector(command) not in connectors:
        connectors.append(connector)
    else:
        connector = connectors[connectors.index(connector)]
    connector.append(Connection(follows))

json = '{"settings":{"nodeAttribs":[],"edgeAttribs":[],"curvedEdges":false,"appliedForce":false,"forceRadius":300},"nodes":['

strongConnectors = []
for connector in connectors:
    if connector.totalConnections < 20:
        continue
    json += (
        '{"name": "' + connector.name +
        '", "type": "*", "x": ' + str(random.randint(0, 800)) +
        ', "y": ' + str(random.randint(0, 800)) +
        ', "attribs": []}, '
    )
    strongConnectors.append(connector)

json = json[:-2] + '],"edges":['

for connector in strongConnectors:
    for connection in connector.connections:
        prob = connection.frequency / connector.totalConnections
        if prob > 0.15 and Connector(connection.name) in strongConnectors:
            name = str(prob)
            name = name[:4]
            json += (
                '{"name": "' + name + 
                '","sourceNodeNum": ' + str(strongConnectors.index(connector)) +
                ',"targetNodeNum": ' + str(strongConnectors.index(Connector(connection.name))) +
                '}, '
            )
json = json[:-2] + "]}"

out = open("unix.json", "w")

out.write(json)
out.close()