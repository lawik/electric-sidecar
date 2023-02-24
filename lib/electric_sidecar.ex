defmodule ElectricSidecar do
  use GenServer

  require Logger

  @node_dir Path.join(:code.priv_dir(:electric_sidecar), "node")
  {_, 0} = System.shell("npm ci", cd: @node_dir)

  def start_link(opts) do
    GenServer.start_link(ElectricSidecar, opts, opts)
  end

  @impl true
  def init(opts) do
    db_path = Keyword.get(opts, :path)
    config = Keyword.fetch!(opts, :config) |> Jason.encode!()
    pid = Keyword.get(opts, :pid)
    priv_path = :code.priv_dir(:electric_sidecar)
    template_path = Path.join(priv_path, "sidecar.js.eex")

    script = EEx.eval_file(template_path, config_json: config)
    script_name = "index.js"

    path = Path.join(priv_path, "node")
    File.mkdir_p!(path)
    script_path = Path.join(path, script_name)
    File.write!(script_path, script)

    Logger.debug("db_path: #{db_path}")
    Logger.debug("script_path: #{script_path}")
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
    Logger.debug("port output: #{change}")

    case change do
      "emit" <> _ ->
        nil

      change ->
        send(state.pid, {:change, change})
    end

    {:noreply, state}
  end

  @impl true
  def handle_info(other, state) do
    Logger.debug("other msg: #{inspect(other)}")
    {:noreply, state}
  end

  @impl true
  def terminate(reason, _state) do
    Logger.debug("terminate: #{inspect(reason)}")
    :normal
  end
end
