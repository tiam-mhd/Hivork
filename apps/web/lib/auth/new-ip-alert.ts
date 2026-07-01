const NEW_IP_ALERT_KEY = 'hivork_new_ip_alert';

export function setNewIpAlertPending(value: boolean): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  if (value) {
    sessionStorage.setItem(NEW_IP_ALERT_KEY, '1');
  } else {
    sessionStorage.removeItem(NEW_IP_ALERT_KEY);
  }
}

export function consumeNewIpAlertPending(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  const pending = sessionStorage.getItem(NEW_IP_ALERT_KEY) === '1';
  sessionStorage.removeItem(NEW_IP_ALERT_KEY);
  return pending;
}
