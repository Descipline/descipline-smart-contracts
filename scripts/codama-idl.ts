import { createFromRoot } from 'codama';
import { rootNodeFromAnchor, AnchorIdl } from '@codama/nodes-from-anchor';
import { renderVisitor as renderJavaScriptVisitor } from "@codama/renderers-js";
import anchorIdl from '../target/idl/descipline.json'; // Adjust path to your Anchor IDL
// import path from 'path';

// Create a Codama root node from the Anchor IDL
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl as AnchorIdl));

// Define the output path for the generated client
// const jsClient = path.join(__dirname, "..", "clients", "js"); // Example output path

// Render the JavaScript client using the Codama visitor
codama.accept(
  renderJavaScriptVisitor("descipline-lib/")
);