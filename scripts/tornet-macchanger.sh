#!/bin/bash
IFACE=${1:-eth0}
ACTION=${2:-status}

get_status() {
    macchanger -s "$IFACE"
}

spoof() {
    IP_INFO=$(ip -4 addr show "$IFACE" | grep -oP '(?<=inet\s)\d+(\.\d+){3}/\d+' | head -n1)
    GW=$(ip route | grep default | awk '{print $3}' | head -n1)
    
    ip link set "$IFACE" down
    macchanger -r "$IFACE"
    ip link set "$IFACE" up
    
    if [ -n "$IP_INFO" ]; then
        ip addr add "$IP_INFO" dev "$IFACE" 2>/dev/null || true
    fi
    if [ -n "$GW" ]; then
        ip route add default via "$GW" dev "$IFACE" 2>/dev/null || true
    fi
    macchanger -s "$IFACE"
}

restore() {
    IP_INFO=$(ip -4 addr show "$IFACE" | grep -oP '(?<=inet\s)\d+(\.\d+){3}/\d+' | head -n1)
    GW=$(ip route | grep default | awk '{print $3}' | head -n1)
    
    ip link set "$IFACE" down
    macchanger -p "$IFACE"
    ip link set "$IFACE" up
    
    if [ -n "$IP_INFO" ]; then
        ip addr add "$IP_INFO" dev "$IFACE" 2>/dev/null || true
    fi
    if [ -n "$GW" ]; then
        ip route add default via "$GW" dev "$IFACE" 2>/dev/null || true
    fi
    macchanger -s "$IFACE"
}

case "$ACTION" in
    spoof)
        spoof
        ;;
    restore)
        restore
        ;;
    status|*)
        get_status
        ;;
esac

