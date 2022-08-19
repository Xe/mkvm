/** @jsxImportSource xeact */

import { u } from "xeact";

type Distro = {
  name: string;
  downloadURL: string;
  sha256Sum: string;
  minSize: string;
  format: string;
};

const getDistros = async (): Promise<Distro[]> => {
  const resp = await fetch(u("/api/v1/distros"));
  if (resp.status !== 200) {
    const body = await resp.text();
    throw new Error("wrong status code: " + resp.status + "\n\n" + body);
  }

  const result: Distro[] = await resp.json();

  return result;
};

const user_data_template = `#cloud-config
#vim:syntax=yaml

users:
  - name: xe
    groups: [ wheel ]
    sudo: [ "ALL=(ALL) NOPASSWD:ALL" ]
    shell: /bin/bash
`;

type NewInstance = {
  name?: string;
  memory_mb?: number;
  cpus?: number;
  host: string;
  disk_size_gb?: number;
  zvol_prefix?: string;
  distro: string;
  user_data?: string;
  join_tailnet: boolean;
};

type Instance = {
  uuid: string;
  name: string;
  host: string;
  mac_address: string;
  memory: number;
  disk_size: number;
  zvol_name: string;
  status: string;
  distro: string;
  join_tailnet: boolean;
};

const makeInstance = async (ni: NewInstance): Promise<Instance> => {
  const resp = await fetch(u("/api/v1/instances"), {
    method: "POST",
    body: JSON.stringify(ni),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
  });

  if (resp.status !== 200) {
    const body = await resp.text();
    throw new Error("wrong status code: " + resp.status + "\n\n" + body);
  }

  const instance: Instance = await resp.json();
  return instance;
};

export const Page = async () => {
  const distros = await getDistros();

  const nameBox = <input type="text" placeholder="crobat" />;
  const memoryBox = <input type="text" placeholder="512" />;
  const cpuBox = <input type="text" placeholder="2" />;
  // TODO(sephiraloveboo): replace this with an API call to waifud once #18 lands.
  const hosts = [
    "kos-mos",
    "logos",
    "ontos",
    "pneuma",
  ].map((host) => <option value={host}>host</option>);
  const host = <select>{hosts}</select>;
  const disk_size_gb = <input type="text" value="25" />;
  const zvol_prefix = <input type="text" value="rpool/local/vms" />;
  const distro = (
    <select id="selectBox">
      {distros.map((d) => <option value={d.name}>{d.name}</option>)}
    </select>
  );
  distro.onchange = () => {
    let selectedDistro: any | null = null;
    distros.forEach((d) => {
      if (d.name == distro.value) {
        selectedDistro = d;
      }
    });

    if (selectedDistro == null) {
      console.log(
        "this shouldn't happen, selected distro doesn't exist in our list??",
      );
      return;
    }

    const disk_size = parseInt(disk_size_gb.value, 10);
    if (disk_size < selectedDistro.minSize) {
      disk_size_gb.value = `${selectedDistro.minSize}`;
    }
  };
  const user_data = (
    <textarea rows="10" cols="40">{user_data_template}</textarea>
  );
  const join_tailnet = <input type="checkbox" checked="true" />;

  const submit = <button>Create that sucker</button>;
  submit.onclick = async () => {
    let req: NewInstance = {
      name: nameBox.value != "" ? nameBox.value : undefined,
      memory_mb: memoryBox.value != ""
        ? parseInt(memoryBox.value, 10)
        : undefined,
      cpus: cpuBox.value != "" ? parseInt(cpuBox.value, 10) : undefined,
      host: host.value,
      disk_size_gb: disk_size_gb.value != ""
        ? parseInt(disk_size_gb.value, 10)
        : undefined,
      zvol_prefix: zvol_prefix.value != "" ? zvol_prefix.value : undefined,
      distro: distro.value,
      user_data: user_data.value,
      join_tailnet: join_tailnet.checked,
    };
    console.log(req);
    let instance = await makeInstance(req);
    console.log(instance);
    window.location.href = u(`/admin/instances/${instance.uuid}`);
  };

  return (
    <div>
      <table>
        <tr>
          <th>Name</th>
          <td>{nameBox}</td>
        </tr>
        <tr>
          <th>Memory (MB)</th>
          <td>{memoryBox}</td>
        </tr>
        <tr>
          <th>CPU cores</th>
          <td>{cpuBox}</td>
        </tr>
        <tr>
          <th>Host</th>
          <td>{host}</td>
        </tr>
        <tr>
          <th>Disk size (GB)</th>
          <td>{disk_size_gb}</td>
        </tr>
        <tr>
          <th>ZVol prefix</th>
          <td>{zvol_prefix}</td>
        </tr>
        <tr>
          <th>Distro</th>
          <td>{distro}</td>
        </tr>
        <tr>
          <th>Userdata</th>
          <td>{user_data}</td>
        </tr>
        <tr>
          <th>Join tailnet + SSH?</th>
          <td>{join_tailnet}</td>
        </tr>
        <tr>
          <td>{""}</td>
        </tr>
        <tr>
          <td>{submit}</td>
        </tr>
      </table>
    </div>
  );
};
