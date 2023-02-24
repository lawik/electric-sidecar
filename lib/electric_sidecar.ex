defmodule ElectricSidecar do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(ElectricSidecar, opts, opts)
  end

  @impl true
  def init(opts) do
    db_path = Keyword.get(opts, :path)
    config_path = Keyword.get(opts, :config_path)
    pid = Keyword.get(opts, :pid)
    [_preamble, config] = config_path |> File.read!() |> String.split("export default ")
    script = EEx.eval_file("lib/sidecar.js.eex", config_json: config)
    script_name = "index.js"

    priv_path = :code.priv_dir(:electric_sidecar)
    path = Path.join(priv_path, "node")
    File.mkdir_p!(path)
    script_path = Path.join(path, script_name)
    File.write!(script_path, script)

    IO.inspect(db_path, label: "database")
    IO.inspect(config_path, label: "config")
    IO.inspect(script_path, label: "script")
    Process.flag(:trap_exit, true)

    port =
      Port.open({:spawn, "node #{script_path} #{db_path}"}, [
        :binary,
        {:packet, 4},
        :exit_status
      ])

    Port.monitor(port)
    {:ok, %{port: port, pid: pid}}
  end

  @impl true
  def handle_info({_port, {:data, change}}, state) do
    IO.inspect(change, label: "change")
    send(state.pid, {:change, change})
    {:noreply, state}
  end

  @impl true
  def handle_info(other, state) do
    IO.inspect(other, label: "other")
    {:noreply, state}
  end

  @impl true
  def terminate(reason, state) do
    IO.inspect(reason, label: "terminate")
    :normal
  end
end
