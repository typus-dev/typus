#!/bin/bash

# Create .disable files for modules that should be disabled
# By default, all modules are enabled unless a .disable file exists

# Example usage:
# To disable a module, uncomment the line below and run this script
# modules=(
#   "demo"  # This would disable the demo module
# )

modules=(
  # Uncomment lines below to disable specific modules
  # "auth"
  # "blog"
  # "dashboard"
  # "demo"
  # "home"
  # "jobs"
  # "news"
  # "roles"
  # "server"
  # "upwork"
  # "users"
)

for module in "${modules[@]}"; do
  touch "src/modules/$module/.disable"
  echo "Created .disable file for $module module (module disabled)"
done

if [ ${#modules[@]} -eq 0 ]; then
  echo "No modules were disabled. All modules will be enabled by default."
else
  echo "Disable files created successfully for ${#modules[@]} modules."
fi
