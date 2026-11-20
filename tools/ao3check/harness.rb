# Runs AO3's real lib/css_cleaner.rb (from otwcode/otwarchive) outside Rails.
# CSS on stdin -> JSON {css, errors} on stdout.
#   OTW_DIR   checkout of otwarchive with lib/css_cleaner.rb + config/config.yml
#   LIBS_DIR  optional: folder with git clones of css_parser (v3.2.0),
#             addressable and publicsuffix-ruby, for machines without rubygems
Encoding.default_external = Encoding::UTF_8
require 'yaml'
require 'ostruct'
require 'json'
otw = File.expand_path(ENV.fetch('OTW_DIR'))
if (libs = ENV['LIBS_DIR'])
  Dir[File.join(libs, '*', 'lib')].each { |d| $LOAD_PATH.unshift(d) }
end
begin
  require 'ssrf_filter'          # only used by css_parser to fetch remote CSS
rescue LoadError
  Object.const_set(:SsrfFilter, Module.new)
  $LOADED_FEATURES << 'ssrf_filter.rb'
end
class Object
  def blank?; respond_to?(:empty?) ? (empty? || (is_a?(String) && strip.empty?)) : !self; end
  def present?; !blank?; end
  def exclude?(x); !include?(x); end
end
ArchiveConfig = OpenStruct.new(YAML.safe_load(File.read(File.join(otw, 'config/config.yml')), aliases: true))
# AO3 runs with a regexp timeout; css_cleaner rescues Regexp::TimeoutError and rejects the value.
Regexp.timeout = 1.0
require File.join(otw, 'lib/css_cleaner')
class Errs
  attr_reader :list
  def initialize; @list = []; end
  def add(_base, key, **opts); @list << [key, opts]; end
end
class Runner
  include CssCleaner
  attr_reader :errors
  def initialize; @errors = Errs.new; end
end
r = Runner.new
$stdout.set_encoding('UTF-8')
out = r.clean_css_code($stdin.read.force_encoding('UTF-8'), prefix: '#workskin')
puts JSON.generate(css: out, errors: r.errors.list)
