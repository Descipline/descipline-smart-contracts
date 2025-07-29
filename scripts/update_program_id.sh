#!/bin/bash

# NEW_PROGRAM_ID="descip1111111111111111111111111111111111111"
NEW_PROGRAM_ID="HHviGr7n1GBLvSf51pjrPpXtxzkJCNghioR5cCMELskS"
PROGRAM_NAME="descipline"
LIB_RS_PATH="programs/$PROGRAM_NAME/src/lib.rs"
ANCHOR_TOML_PATH="Anchor.toml"

# Check files exist
if [ ! -f "$ANCHOR_TOML_PATH" ]; then
  echo "Error: $ANCHOR_TOML_PATH not found"
  exit 1
fi

if [ ! -f "$LIB_RS_PATH" ]; then
  echo "Error: $LIB_RS_PATH not found"
  exit 1
fi

echo "🔧 Updating $ANCHOR_TOML_PATH..."
sed -i -E "s|($PROGRAM_NAME\s*=\s*\").*(\")|\1$NEW_PROGRAM_ID\2|" "$ANCHOR_TOML_PATH"

echo "🔧 Updating $LIB_RS_PATH..."
sed -i -E "s|declare_id!\(\".*\"\)|declare_id!(\"$NEW_PROGRAM_ID\")|" "$LIB_RS_PATH"

echo "✅ Updated programId to $NEW_PROGRAM_ID"
