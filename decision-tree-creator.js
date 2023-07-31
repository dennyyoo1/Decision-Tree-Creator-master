"use strict"

//store all nodes
var nodes = []

//store the user"s actions
var input = {
  mouseChecked: false,
  selected: false,
  hovered: false,
  mousePos: {x:0, y:0},
  absMousePos: {x:0, y:0},
  screenPos: {x:0, y:0},
  screenScale: 1,
  graphTitle: "my graph",
  creatingEdge: false,
  showName: true,
};

//store the settings of the graph
var settings = {
  nodeAttribs: [],
  edgeAttribs: [],
  curvedEdges: false,
  appliedForce: false,
  forceRadius: 300,
}

///////////////////////////////////////////////
//SVG
///////////////////////////////////////////////

//create context
var svg = d3.select("#graph").append("svg")
  .attr("width", window.innerWidth)
  .attr("height", window.innerHeight);
var activeLayer = svg.append("g");

//create layers
var edgeLayer = activeLayer.append("g");
var nodeLayer = activeLayer.append("g");
updateLayer(activeLayer);

//define pre-made shapes
var defs = svg.append("svg:defs");
defs.append("svg:marker")
  .attr("id", "end-arrow")
  .attr("viewBox", "0 -5 10 10")
  .attr("refX", "20")
  .attr("markerWidth", 3.5)
  .attr("markerHeight", 3.5)
  .attr("orient", "auto")
  .append("svg:path")
  .attr("d", "M 0, -5 L 10, 0 L 0, 5");

//mouse move
svg.on("mousemove", function(){
    var absMousePos = {
      x: d3.event.pageX,
      y: d3.event.pageY
    };

    var mousePos = {
      x: absMousePos.x / input.screenScale - input.screenPos.x,
      y: absMousePos.y / input.screenScale - input.screenPos.y
    };

    //calculate delta
    var mouseDelta = {
      x: absMousePos.x - input.absMousePos.x,
      y: absMousePos.y - input.absMousePos.y
    };

    //if and edge is being created
    if(input.mouseChecked && input.selected && (event.shiftKey || input.creatingEdge)){
      //delete the previous edge
      if(input.creatingEdge) input.creatingEdge.model.remove();

      //add a new edge
      input.creatingEdge = {
        name: false,
        sourceNode: input.selected,
        targetNode: input.mousePos,
      }
      addEdge(edgeLayer, input.creatingEdge);
    }
    //if a node is being dragged
    else if(input.mouseChecked && input.selected){
      input.selected.x += mouseDelta.x / input.screenScale;
      input.selected.y += mouseDelta.y / input.screenScale;
      updateNode(input.selected);
    }
    //if the screen is being dragged
    else if(input.mouseChecked){
      input.screenPos.x += mouseDelta.x;
      input.screenPos.y += mouseDelta.y;
      updateLayer(activeLayer);
    }

    //update the global mouse position
    input.absMousePos = absMousePos;
    input.mousePos = mousePos;
  })
  //mouse down
  .on("mousedown", function(){
    if(input.mouseChecked) return; input.mouseChecked = true;
    //if the click is on the background
    if(input.selected){
      input.selected.model.classed("selected", false);
      input.selected = false;
    }
    writeLayer(activeLayer);
    //if a node is being added
    if(event.shiftKey){
      var node = {
        name: "",
        type: "+",
        x: input.mousePos.x,
        y: input.mousePos.y,
        attribs: [],
        model: null,
        edges: [],
        inputs: [],
      };
      //create default attribute values
      for(var a = 0; a < settings.nodeAttribs.length; a++){
        node.attribs.push({
          title: settings.nodeAttribs[a].title,
          value: "my value"
        });
      }
      addNode(nodeLayer, node);
    }
  })
  //mouse up
  .on("mouseup", function(){
    input.mouseChecked = false;
    //check if an edge was created
    if(input.creatingEdge){
      input.creatingEdge.model.remove();
      if(input.hovered && (input.hovered != input.selected)){
        var edge = {
          name: "",
          sourceNode: input.selected,
          targetNode: input.hovered,
        };
        addEdge(edgeLayer, edge);
        updateNode(input.selected);
      }
      input.creatingEdge = false;
    }
  })
  //zooming
  .on("mousewheel", function(){
    input.screenScale *= (10 - Math.sign(event.deltaY)) / 10;
    updateLayer(activeLayer);
  });

//update active layer
function updateLayer(layer, write = true){
  layer.attr("transform", 
    "scale(" + input.screenScale + ")" +
    "translate(" + input.screenPos.x + " " + input.screenPos.y + ") ");
  if (write) writeLayer(layer);
}

//write
function writeLayer(layer){
  var info = d3.select("#info").text("");
  info.append("div")
    .attr("id", "type")
    .text("MAIN LAYER");
  info.append("div").text("title: ")
    .append("input")
      .attr("type", "text")
      .attr("name", "title")
      .attr("value", input.graphTitle)
      .on("change", function(){
        input.graphTitle = this.value;
        updateLayer(layer);
      });
}

///////////////////////////////////////////////
//Buttons
///////////////////////////////////////////////

//upload button(s)
d3.select("#upload-input").on("click", function(){
  document.getElementById("hidden-file-upload").click();
});
d3.select("#hidden-file-upload").on("change", function(){
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    var uploadFile = this.files[0];
    var filereader = new window.FileReader();
    filereader.onload = function(){
      var txtRes = filereader.result;
      // TODO better error handling
      try{
        deleteGraph();
        var jsonObj = JSON.parse(txtRes);

        //load the settings
        settings = jsonObj.settings;

        //load the nodes
        var newNodes = jsonObj.nodes;
        newNodes.forEach(function(val, i){
          var newNode = val;
          newNode.model = null;
          newNode.edges = [];
          newNode.inputs = [];
          addNode(nodeLayer, newNode);
        });

        //load the edges
        var newEdges = jsonObj.edges;
        newEdges.forEach(function(val, i){
          var newEdge = {
            name: val.name,
            sourceNode: nodes[val.sourceNodeNum],
            targetNode: nodes[val.targetNodeNum],
          };
          addEdge(edgeLayer, newEdge);
        });
      }catch(err){
        window.alert("Error parsing uploaded file\nerror message: " + err.message);
        return;
      }
    };
    filereader.readAsText(uploadFile);

  } else {
    alert("Your browser won't let you save this graph -- try upgrading your browser to IE 10+ or Chrome or Firefox.");
  }
});

//download button
d3.select("#download-input").on("click", function(){
  var saveNodes = [];
  var edges = [];
  //save nodes
  nodes.forEach(function(val, i){
    saveNodes.push({name: val.name, type: val.type, x: val.x, y: val.y, attribs: val.attribs});
    val.edges.forEach(function(e, i){edges.push(e);});
  });
  //save edges
  var saveEdges = [];
  edges.forEach(function(val, i){
    saveEdges.push({name: val.name, sourceNodeNum: nodes.indexOf(val.sourceNode), targetNodeNum: nodes.indexOf(val.targetNode)});
  });
  var blob = new Blob([window.JSON.stringify({"settings": settings, "nodes": saveNodes, "edges": saveEdges})], {type: "text/plain;charset=utf-8"});
  saveAs(blob, input.graphTitle + ".json");
});

//delete button
d3.select("#delete-graph").on("click", function(){
  deleteGraph();
});

//settings button
d3.select("#settings").on("click", function(){
  updateSettings();
});

//home position button
d3.select("#home").on("click", function(){
    input.screenScale = 1;
    input.screenPos = {x:0, y:0};
    updateLayer(activeLayer);
});

//help button
d3.select("#help").on("click", function(){
    d3.select("#info").text("Instructions:")
      .append("div").attr("id","instructions")
        //attribute information
        .append("div").text("Click on the SET tab to create the attributes for both nodes and edges")
        .append("div").text(" - ")

        //Node information
        .append("div").text("Shift-click on the background to add a node")
        .append("div").text("Click on the node to edit it's attributes")
        .append("div").text("Change the type to adjust the symbol and purpose of the node")
        .append("div").text(" - ")

        //Edge information
        .append("div").text("Shift-Click and drag between two nodes to add an edge")
        .append("div").text("To edit an edge, select it's source node")
        .append("div").text("Shift-Drag Nodes to add Edges")
        .append("div").text(" - ")

        //Saving and Loaduing information
        .append("div").text("Click the SAVE button to download the graph as a .JSON file")
        .append("div").text("Click the LOAD button to load a graph from a .JSON file");

});

function deleteGraph(){
  nodes = [];
  edgeLayer.text("");
  nodeLayer.text("");
  updateLayer(activeLayer);
}

function writeEdgeAttrib(attribList, attrib){
  //create attribute
  var attribInfo = attribList.append("div")
        .attr("id", "attribInfo")
        .text("ATTRIBUTE ")

  //delete button
  attribInfo.append("input")
    .attr("type", "button")
    .attr("class", "innerButton")
    .attr("value", "x")
      .on("click", function(){
        for(var n = 0; n < nodes.length; n++){
          for(var e = 0; e < nodes[n].edges.length; e++){
            for(var a = 0; a < nodes[n].edges[e].attribs.length; a++){
              if(nodes[n].edges[e].attribs[a].title == attrib.title){
                nodes[n].edges[e].attribs.splice(a, 1);
              }
            }
          }
        }
        settings.edgeAttribs.splice(settings.edgeAttribs.indexOf(attrib),1);
        updateSettings();
        return;
      });

  //title and value
  attribInfo.append("div").text("title: ")
    .append("input")
      .attr("type", "text")
      .attr("name", "title")
      .attr("value", attrib.title)
      .on("change", function(){
        for(var n = 0; n < nodes.length; n++){
          for(var e = 0; e < nodes[n].edges.length; e++){
            for(var a = 0; a < nodes[n].edges[n].attribs.length; a++){
              if(nodes[n].edges[e].attribs[a].title == attrib.title){
                nodes[n].edges[e].attribs[a].title = this.value;
              }
            }
          }
        }
        attrib.title = this.value;
      });

  //change type
  var types = attribInfo.append("div").text("type: ")
    .append("select")
      .on("change", function(){
        //TODO
      });
  types.append("option").attr("value", "text").text("text");
  //types.append("option").attr("value", "number").text("number");
  //types.append("option").attr("value", "color").text("color");
}

function writeNodeAttrib(attribList, attrib){
  //create attribute
  var attribInfo = attribList.append("div")
        .attr("id", "attribInfo")
        .text("ATTRIBUTE ")

  //delete button
  attribInfo.append("input")
    .attr("type", "button")
    .attr("class", "innerButton")
    .attr("value", "x")
      .on("click", function(){
        for(var n = 0; n < nodes.length; n++){
          for(var a = 0; a < nodes[n].attribs.length; a++){
            if(nodes[n].attribs[a].title == attrib.title){
              nodes[n].attribs.splice(a, 1);
            }
          }
        }
        settings.nodeAttribs.splice(settings.nodeAttribs.indexOf(attrib),1);
        updateSettings();
        return;
      });

  //title and value
  attribInfo.append("div").text("title: ")
    .append("input")
      .attr("type", "text")
      .attr("name", "title")
      .attr("value", attrib.title)
      .on("change", function(){
        for(var n = 0; n < nodes.length; n++){
          for(var a = 0; a < nodes[n].attribs.length; a++){
            if(nodes[n].attribs[a].title == attrib.title){
              nodes[n].attribs[a].title = this.value;
            }
          }
        }
        attrib.title = this.value;
      });

  //change type
  var types = attribInfo.append("div").text("type: ")
    .append("select")
      .on("change", function(){
      //TODO
      });
  types.append("option").attr("value", "text").text("text");
  //types.append("option").attr("value", "number").text("number");
  //types.append("option").attr("value", "color").text("color");
}

function updateSettings(){
  //create settings page
  var settingsPage = d3.select("#info").text("SETTINGS:");

  //add node settings
  var nodeAttribList = settingsPage.append("div")
    .text("NODE ATTRIBUTES").attr("id", "instructions").append("div");

  //write the node attributes
  if(settings.nodeAttribs.length == 0) nodeAttribList.text("No Attributes");
  for(var a = 0; a < settings.nodeAttribs.length; a++){
    writeNodeAttrib(nodeAttribList, settings.nodeAttribs[a]);
  }

  //add new node attribute
  nodeAttribList.append("input")
    .attr("type", "button")
    .attr("class", "innerButton")
    .attr("value", "+")
      .on("click", function(){
        var name = "my attribute " + settings.nodeAttribs.length;
        settings.nodeAttribs.push({
          title: name
        });

        //apply new settings
        for(var n = 0; n < nodes.length; n++){
          nodes[n].attribs.push({
            title: name,
            value: "my value"
          });
        }
        updateSettings();
        return;
      });

  //add edge settings
  var edgeAttribList = settingsPage.append("div")
    .text("EDGE ATTRIBUTES").attr("id", "instructions").append("div");

  //write edge attributes
  if(settings.edgeAttribs.length == 0) edgeAttribList.text("No Attributes");
  for(var a = 0; a < settings.edgeAttribs.length; a++){
    writeEdgeAttrib(edgeAttribList, settings.edgeAttribs[a]);
  }

  //add new edge attribute
  edgeAttribList.append("input")
    .attr("type", "button")
    .attr("class", "innerButton")
    .attr("value", "+")
      .on("click", function(){
        var name = "my attribute" + settings.edgeAttribs.length;
        settings.edgeAttribs.push({
          title: name
        });

        //apply update to every edge
        for(var n = 0; n < nodes.length; n++){
          for(var e = 0; e < nodes[n].edges.length; n++){
            nodes[n].edges[e].attribs.push({
              title: name,
              value: "my value"
            });
          }
        }
        updateSettings();
        return;
      });

  //change between straight and curvy edges
  var curveString = "Curved Edges";
  if (settings.curvedEdges) curveString = "Straight Edges";
  var curveSettings = settingsPage.append("div")
    .text("EDGE SHAPE:").attr("id", "instructions").append("div");
  curveSettings.append("input")
    .attr("type", "button")
    .attr("class", "linkButton")
    .attr("value", curveString)
      .on("click", function(){
        settings.curvedEdges = !settings.curvedEdges;
        for(var n = 0; n < nodes.length; n++){
          updateNode(nodes[n]);
        }
        updateSettings();
      });

  //hold for directed graph
  var forceString = "Apply Force";
  if (settings.appliedForce) forceString = "Halt Force";
  var forceSettings = settingsPage.append("div")
    .text("AUTO ARRANGE:").attr("id", "instructions").append("div");
  forceSettings.append("input")
    .attr("type", "button")
    .attr("class", "linkButton")
    .attr("value", forceString)
      .on("mousedown", function(){
        settings.appliedForce = !settings.appliedForce;
        updateSettings();
      });
  forceSettings.append("div").text("radius");
  forceSettings.append("input")
    .attr("type", "range")
    .attr("min", "0")
    .attr("value", settings.forceRadius / 5)
    .attr("max", "100")
    .attr("class", "slider")
      .on("input", function(){
        settings.forceRadius = this.value * 5;
      });
}

//applies force directed graph
setInterval(function(){
  if (!settings.appliedForce) return;

  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n];
    var fx = 0, fy = 0;

    if(node.edges.length == 0 && node.inputs.length == 0) return;

    for (var e = 0; e < node.edges.length; e++) {
      var dx = node.edges[e].targetNode.x - node.x;
      var dy = node.edges[e].targetNode.y - node.y;
      var dt = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
      if (dt == 0) dt = 0.01;
      var rm = 1.25 - parseFloat(node.edges[e].name);
      if (isNaN(rm)) rm = 1;
      var dc = -settings.forceRadius * rm + dt;

      fx += (dx / dt) * dc;
      fy += (dy / dt) * dc;
    }

    for (var e = 0; e < node.inputs.length; e++) {
      var dx = node.inputs[e].sourceNode.x - node.x;
      var dy = node.inputs[e].sourceNode.y - node.y;
      var dt = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
      if (dt == 0) dt = 0.01;
      var rm = 1.25 - parseFloat(node.inputs[e].name);
      if (isNaN(rm)) rm = 1;
      var dc = -settings.forceRadius * rm + dt;

      fx += (dx / dt) * dc;
      fy += (dy / dt) * dc;
    }

    node.x += 0.1 * fx / (node.edges.length + node.inputs.length);
    node.y += 0.1 * fy / (node.edges.length + node.inputs.length);

    updateNode(node, false);
  }
});

///////////////////////////////////////////////
//Edges
///////////////////////////////////////////////

//create an edge
function addEdge(svg, edge){
  //add attributes
  edge.attribs = [];
  for(var a = 0; a < settings.edgeAttribs.length; a++){
    edge.attribs.push({
      title: settings.edgeAttribs[a].title,
      value: "my value"
    });
  }

  //create the model
  edge.model = svg.append("g")
    .classed("edge", true);
  var path = edge.model.append("path");
  edge.model.append("text");
  
  //add the edges
  if(edge != input.creatingEdge){
    edge.sourceNode.edges.push(edge);
    edge.targetNode.inputs.push(edge);
    path.attr("marker-end", "url(#end-arrow)");
  }
  updateEdge(edge);
}

//update edge
function updateEdge(edge){
  var midPoint = {
    x: (edge.sourceNode.x + edge.targetNode.x) / 2,
    y: (edge.sourceNode.y + edge.targetNode.y) / 2
  };
  var delta = {
    x: edge.sourceNode.x - edge.targetNode.x,
    y: edge.sourceNode.y - edge.targetNode.y
  };

  //adjust for if the edges are curved or not
  var s = 0.2;

  //first, check to see if there are duplicate nodes
  var curve = 0;
  for (var e = 0; e < edge.sourceNode.edges.length; e++) {
     if (edge.sourceNode.edges[e] == edge) {
       curve += 1;
     }
     else if (edge.sourceNode.edges[e].targetNode == edge.targetNode) {
       curve += 2;
       break;
     }
  }
  if (curve == 3){
    s *= -1;
    edge.model.select("path").attr("d", "M" + edge.sourceNode.x + "," + edge.sourceNode.y + 
      "C" + (midPoint.x - delta.y * s) + "," + (midPoint.y + delta.x * s) + 
      "," + (midPoint.x - delta.y * s) + "," + (midPoint.y + delta.x * s) +
      "," + edge.targetNode.x + "," + edge.targetNode.y)
    .attr("fill", "transparent");
  }
  else if (settings.curvedEdges || curve == 2) {
    edge.model.select("path").attr("d", "M" + edge.sourceNode.x + "," + edge.sourceNode.y + 
      "C" + (midPoint.x - delta.y * s) + "," + (midPoint.y + delta.x * s) + 
      "," + (midPoint.x - delta.y * s) + "," + (midPoint.y + delta.x * s) +
      "," + edge.targetNode.x + "," + edge.targetNode.y)
    .attr("fill", "transparent");
  }
  else {
    s = 0.04;
    edge.model.select("path")
      .attr("d", "M" + edge.sourceNode.x + "," + edge.sourceNode.y + "L" + edge.targetNode.x + "," + edge.targetNode.y);
  }

  //calculate the angle and draw
  var r = Math.atan((edge.sourceNode.y - edge.targetNode.y) / (edge.sourceNode.x - edge.targetNode.x));
  if (isNaN(r)) r = 1;
  if (edge.name){
    var d = delta.x < 0 ? 0 : 10;
    edge.model.select("text")
      .attr("text-anchor","middle")
      .attr("transform", 
        "translate(" + (midPoint.x - delta.y * s) + " " + (midPoint.y + delta.x * s) + 
        ") rotate(" + (180 / Math.PI * r) + 
        ") translate(" + d + " " + d + ")")
      .text(edge.name);
  }
}

function addEdgeInfo(edge, list){
  //create info
  var edgeInfo = list.append("div")
      .attr("id", "edgeInfo")
      .text("EDGE ")

      //allow for highlighting
      .on("mouseover", function(){
        edge.model.classed("highlighted", true);
      })
      .on("mouseout", function(){
        edge.model.classed("highlighted", false);
      });

    //add delete button
    edgeInfo.append("input")
      .attr("type", "button")
      .attr("class", "innerButton")
      .attr("value", "x")
      .on("click", function(){
        removeEdge(edge);
      });

    //add target node
    edgeInfo.append("div")
      .text("target node: ")
      .append("input")
        .attr("type", "button")
        .attr("class", "linkButton")
        .attr("value", edge.targetNode.name)

        //jump to target node
        .on("click", function(){
          input.selected.model.classed("selected", false);
          input.selected = edge.targetNode;
          input.selected.model.classed("selected", true);
          updateNode(input.selected);
        });

    //add value and title
    edgeInfo.append("div").text("title: ")
      .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("value", edge.name)
        .on("change", function(){
          edge.name = this.value;
          updateEdge(edge);
        });

  //create attributes
  var attribList = edgeInfo.append("div").text("Attributes: ")
  if(edge.attribs.length == 0) attribList.text("No Attributes");
  for(var a = 0; a < edge.attribs.length; a++){

    //add individual attribute
    var attrib = edge.attribs[a];
    var attribInfo = attribList.append("div")
      .attr("id", "attribInfo")
      .text("ATTRIBUTE")

    //add title
    attribInfo.append("div").text("title: ")
      .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("value", attrib.title)
        .on("change", function(){
          attrib.title = this.value;
        });

    //add value
    attribInfo.append("div").text("value: ")
      .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("value", attrib.value)
        .on("change", function(){
          attrib.value = this.value;
        });
  }
}

//remove edge
function removeEdge(edge){
  edge.sourceNode.edges.splice(edge.sourceNode.edges.indexOf(edge), 1);
  edge.targetNode.inputs.splice(edge.targetNode.inputs.indexOf(edge), 1);
  edge.model.remove();
  updateNode(edge.sourceNode);
}

///////////////////////////////////////////////
//Nodes
///////////////////////////////////////////////

//create a node
function addNode(svg, node){
  nodes.push(node);
  node.model = svg.append("g")
    .classed("node", true)
    //mouse down
    .on("mousedown", function(){
      if(input.mouseChecked) return; input.mouseChecked = true;
      //if the node is selected
      if(input.selected) input.selected.model.classed("selected", false);
      input.selected = node;
      node.model.classed("selected", true);
      writeNode(node);
    })
    //mouse up
    .on("mouseup", function(){
      input.mouseChecked = false;
    })
    .on("mouseover", function(){
      input.hovered = node;
    })
    .on("mouseout", function(){
      if(input.hovered == node) input.hovered = false;
    });

  //create the model
  node.model.append("circle")
    .attr("r", 12)
    .attr("id", node.id);
  node.model.append("text").attr("id", "title")
  node.model.append("text").attr("id", "type");
  input.selected = node;
  node.model.classed("selected", true);
  updateNode(node);
}

//update node
function updateNode(node, write = true){
  //transform the node and it's name
  node.model.attr("transform", "translate(" + node.x + " " + node.y + ")");
  if(input.showName) { node.model.select("#title")
    .text(node.name)
    .attr("dx", 15)
    .attr("dy", 2);

  }
  else{ node.model.select("#title")
    .text("");
  }

  //show the node type symbol
  node.model.select("#type")
    .text(node.type)
    .attr("dy", 4)
    .attr("text-anchor","middle");

  //update connected edges
  for(var e = 0; e < node.edges.length; e++){
    updateEdge(node.edges[e]);
  }
  for(var e = 0; e < node.inputs.length; e++){
    updateEdge(node.inputs[e]);
  }
  if (write) writeNode(node);
}

//write
function writeNode(node){
  //create info section
  var info = d3.select("#info").text("");
  info.append("div")
    .attr("id", "type")
    .text("NODE ")

    //add delete button
    .append("input")
      .attr("type", "button")
      .attr("class", "innerButton")
      .attr("value", "x")
      .on("click", function(){
        input.selected = false;

        //delete every connected edge
        for(var e = node.edges.length - 1; e >= 0; e--){
          removeEdge(node.edges[e]);
        }
        for(var e = node.inputs.length - 1; e >= 0; e--){
          removeEdge(node.inputs[e]);
        }
        node.model.remove();
        nodes.splice(nodes.indexOf(node),1);
        updateLayer(activeLayer);
      });

  //add title and value
  info.append("div").text("title: ")
    .append("input")
      .attr("type", "text")
      .attr("name", "title")
      .attr("value", node.name)
      .on("change", function(){
        node.name = this.value;
        updateNode(node);
      });

  //add type options
  var types = info.append("div").text("type: ")
    .append("select")
      .on("change", function(){
        node.type = this.value;
        updateNode(node);
      });

  //add options
  types.append("option").attr("value", "+").text("Sum");
  types.append("option").attr("value", "-").text("Difference");
  types.append("option").attr("value", "X").text("Product");
  types.append("option").attr("value", "/").text("Quotient");
  types.append("option").attr("value", "\u25C7").text("Conditional");
  types.append("option").attr("value", "^").text("Logical And");
  types.append("option").attr("value", "v").text("Logical Or");
  types.append("option").attr("value", "V").text("Input");
  types.append("option").attr("value", "->").text("Output");

  //display the node's attributes
  var attribList = info.append("div").text("Attributes: ")
  if(node.attribs.length == 0) attribList.text("No Attributes");
  for(var a = 0; a < node.attribs.length; a++){

    //display individual attribute
    var attrib = node.attribs[a];
    var attribInfo = attribList.append("div")
      .attr("id", "attribInfo")
      .text("ATTRIBUTE")
    
    //show title
    attribInfo.append("div").text("title: ")
      .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("value", attrib.title)
        .on("change", function(){
          attrib.title = this.value;
        });

    //show value
    attribInfo.append("div").text("value: ")
      .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("value", attrib.value)
        .on("change", function(){
          attrib.value = this.value;
        });
    attribInfo.append("div").text("View Example: ")
        .append("input")
        .attr("type", "button")
        .attr("class", "innerButton")
        .attr("value", "")
        .on("click", function() {
          window.open(attrib.value, "_blank");
        });
    // window.open(attrib.value, "_blank");
  }

  //display all of the information for every edge
  var edgeList = info.append("div").text("Edges: ")
  if(node.edges.length == 0) edgeList.text("No Edges");
  for(var e = 0; e < node.edges.length; e++){
    addEdgeInfo(node.edges[e], edgeList);
  }
}
