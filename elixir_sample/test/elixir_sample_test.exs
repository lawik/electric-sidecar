defmodule ElixirSampleTest do
  use ExUnit.Case
  doctest ElixirSample

  test "greets the world" do
    assert ElixirSample.hello() == :world
  end
end
