import random

class Node:
    def __init__(self, ip):
        self.name = ip
        self.type = "*"
        self.x = random.randint(0, 10000)
        self.y = random.randint(0, 10000)
        self.num = -1
    
    def __str__(self):
        #"name":"Mechanical Pencil","type":"◇","x":844,"y":550,"attribs":[]
        return ( 
            '{"name":"' + str(self.name) + 
            '","type":"' + str(self.type) +
            '","x":' + str(self.x) +
            ',"y":' + str(self.y) +
            ',"attribs":[]}'
        )

    def __hash__(self):
        return hash(self.name)

    def __eq__(self, other):
        return self.name == other.name

nodes = dict()

class Edge:
    def __init__(self, to, fr):
        self.name = ""
        self.source = to
        self.target = fr
    
    def __str__(self):
        #{"name":"0.3","sourceNodeNum":3,"targetNodeNum":8}
        return (
            '{"name":"' + str(self.name) + 
            '","sourceNodeNum":' + str(nodes[self.source].num) +
            ',"targetNodeNum":' + str(nodes[self.target].num) +
            '}'
        )

edges = []

data = open("sample.csv", "r")
i = 0
for line in data:
    i += 1
    if i % 100 != 0: continue
    if i > 10000: break
    line = line.split(",")
    to = line[1]
    fr = line[2]
    nodes.update({ to: Node(to) })
    nodes.update({ fr: Node(fr) })
    edges.append(Edge(to, fr))
data.close()

json = '{"settings":{"nodeAttribs":[],"edgeAttribs":[],"curvedEdges":false,"appliedForce":false,"forceRadius":300},"nodes":['

i = 0
for node in nodes:
    json += str(nodes[node]) + ","
    nodes[node].num = i
    i += 1
json = json[:-1] + '],"edges":['

for edge in edges:
    json += str(edge) + ","
json = json[:-1] + "]}"

out = open("Taiji.json", "w")

out.write(json)
out.close()