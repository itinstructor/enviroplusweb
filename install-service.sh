#!/bin/bash
set -e

USER=$(whoami)
HOME_DIR=$(eval echo ~$USER)
SERVICE_FILE="enviroplusweb.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_FILE"

echo "Installing Enviro Plus Web service for user: $USER"
echo "Home directory detected: $HOME_DIR"
echo "Creating $SERVICE_FILE..."
sudo tee "$SERVICE_PATH" > /dev/null <<EOF
[Unit]
Description=Enviro Plus Web service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME_DIR/enviroplusweb
ExecStart=/bin/bash -c '$HOME_DIR/.virtualenvs/enviroplusweb/bin/python $HOME_DIR/enviroplusweb/enviroplusweb.py >> $HOME_DIR/enviroplusweb/enviroplusweb.log 2>&1'
Restart=on-failure
RestartSec=10
StartLimitIntervalSec=500
StartLimitBurst=3

[Install]
WantedBy=multi-user.target
EOF

echo "Service file created at $SERVICE_PATH"
echo

sudo chmod 644 "$SERVICE_PATH"

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Enabling service..."
sudo systemctl enable "$SERVICE_FILE"

echo "Starting service..."
sudo systemctl start "$SERVICE_FILE"

echo
echo "Enviro Plus Web service installed and started successfully!"
echo "Check the status if needed with: sudo systemctl status $SERVICE_FILE"
echo "View logs with: tail -f $HOME_DIR/enviroplusweb/enviroplusweb.log"

