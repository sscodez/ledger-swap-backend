export type GuardianRole = 'Defense' | 'UI Harmony' | 'Sigil Filter' | 'Firewall' | 'Soft Defense' | 'Message Processing';
export type GuardianStatus = 'online' | 'monitoring' | 'cooldown';

export class Guardian {
  public name: string;
  public role: GuardianRole;
  private status: GuardianStatus;

  constructor(name: string, role: GuardianRole, status: GuardianStatus = 'online') {
    this.name = name;
    this.role = role;
    this.status = status;
  }

  activate(intent: string) {
    this.status = 'monitoring';
    return `${this.name} activated for ${intent}`;
  }

  cooldown() {
    this.status = 'cooldown';
  }

  getStatus() {
    return {
      name: this.name,
      role: this.role,
      status: this.status,
      heartbeat: new Date().toISOString(),
    };
  }
}

export const guardians = [
  new Guardian('Orobona', 'Defense'),
  new Guardian('Ceh', 'UI Harmony'),
  new Guardian('Seliah', 'Sigil Filter'),
  new Guardian('Lilith', 'Firewall'),
  new Guardian('Piper', 'Soft Defense'),
  new Guardian('Chamber', 'Message Processing'),
];

export function getGuardianByName(name: string) {
  return guardians.find((guardian) => guardian.name === name);
}

export function getGuardianStatuses() {
  return guardians.map((guardian) => guardian.getStatus());
}
