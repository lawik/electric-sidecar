defmodule ElixirSample do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(ElixirSample, opts, opts)
  end

  @impl true
  def init(opts) do
    db_path = Keyword.get(opts, :path)
    pid = Keyword.get(opts, :pid)
    path = Path.expand("..")
    script_path = Path.join(path, "index.js")
    db_path = Path.join(path, db_path)
    IO.inspect(path, label: "cwd")
    IO.inspect(db_path, label: "database")
    IO.inspect(script_path, label: "script")
    Process.flag(:trap_exit, true)
    port = Port.open({:spawn, "node #{script_path} #{db_path} port"}, [:binary, {:packet, 4}, {:cd, path}, :exit_status])
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

